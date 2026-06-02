using System.Security.Claims;
using MediCore.Api.DTOs;
using MediCore.Api.Mapper;
using MediCore.Api.Repository;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;
using MediCore.Domain.Exceptions;

namespace MediCore.Api.Services;

public class LabService : ILabService
{
    private readonly ILabTestRepository _labTestRepository;
    private readonly ILabReportRepository _labReportRepository;
    private readonly IUserService _userService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _configuration;

    public LabService(
        ILabTestRepository labTestRepository,
        ILabReportRepository labReportRepository,
        IUserService userService,
        IHttpContextAccessor httpContextAccessor,
        IWebHostEnvironment env,
        IConfiguration configuration)
    {
        _labTestRepository = labTestRepository;
        _labReportRepository = labReportRepository;
        _userService = userService;
        _httpContextAccessor = httpContextAccessor;
        _env = env;
        _configuration = configuration;
    }

    private string GetUserIdFromToken()
        => _httpContextAccessor.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<UserResponseDto?> SafeGetUserAsync(string? userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return null;
        try { return await _userService.GetByIdAsync(userId); }
        catch (IdentityServiceException) { return null; }
    }

    private async Task<LabTestResponseDto> ToResponseAsync(LabTest test)
    {
        var dto = test.ToResponseDto();
        dto.Patient = await SafeGetUserAsync(test.PatientID);
        dto.Doctor = await SafeGetUserAsync(test.DoctorID);
        dto.Technician = await SafeGetUserAsync(test.TechnicianID);
        return dto;
    }

    public async Task<LabTestResponseDto> CreateTestAsync(CreateLabTestRequestDto dto)
    {
        var labTest = dto.ToEntity();
        labTest.DoctorID = GetUserIdFromToken();
        await _labTestRepository.AddAsync(labTest);
        return await ToResponseAsync(labTest);
    }

    public async Task<IEnumerable<LabTestResponseDto>> GetAllTestsAsync()
    {
        var tests = await _labTestRepository.GetAllAsync();
        var result = new List<LabTestResponseDto>();
        foreach (var t in tests) result.Add(await ToResponseAsync(t));
        return result;
    }

    public async Task<LabTestResponseDto> GetTestByIdAsync(string testId)
    {
        var test = await _labTestRepository.GetByIdAsync(testId) ?? throw new LabTestNotFoundException(testId);
        return await ToResponseAsync(test);
    }

    public async Task<IEnumerable<LabTestResponseDto>> GetTestsByPatientAsync(string patientId)
    {
        var tests = await _labTestRepository.GetByPatientIdAsync(patientId);
        var result = new List<LabTestResponseDto>();
        foreach (var t in tests) result.Add(await ToResponseAsync(t));
        return result;
    }

    public async Task<IEnumerable<LabTestResponseDto>> GetTestsByLabTechnicianAsync(string technicianId)
    {
        var tests = await _labTestRepository.GetByLabTechnicianIdAsync(technicianId);
        var result = new List<LabTestResponseDto>();
        foreach (var t in tests) result.Add(await ToResponseAsync(t));
        return result;
    }

    public async Task<LabTestResponseDto> AssignTechnicianAsync(string testId, AssignTechnicianRequestDto dto)
    {
        var test = await _labTestRepository.GetByIdAsync(testId) ?? throw new LabTestNotFoundException(testId);
        if (test.Status == LabTestStatus.Cancelled)
            throw new LabServiceException(ErrorMessages.CannotAssignTechnicianToCancelledTest);

        test.TechnicianID = dto.TechnicianID;
        test.Status = LabTestStatus.InProgress;
        await _labTestRepository.UpdateAsync(test);
        return await ToResponseAsync(test);
    }

    public async Task<LabTestResponseDto> UpdateTestStatusAsync(string testId, UpdateLabTestStatusRequestDto dto)
    {
        var test = await _labTestRepository.GetByIdAsync(testId) ?? throw new LabTestNotFoundException(testId);
        if (test.TechnicianID != GetUserIdFromToken())
            throw new UnauthorizedLabAccessException();
        if (test.Status == LabTestStatus.Cancelled)
            throw new LabServiceException(ErrorMessages.CannotUpdateCancelledTestStatus);

        test.Status = dto.Status;
        await _labTestRepository.UpdateAsync(test);
        return await ToResponseAsync(test);
    }

    public async Task<LabReportResponseDto> UploadReportAsync(string testId, UploadLabReportRequestDto dto)
    {
        var test = await _labTestRepository.GetByIdAsync(testId) ?? throw new LabTestNotFoundException(testId);
        if (test.TechnicianID != GetUserIdFromToken())
            throw new UnauthorizedLabAccessException();
        if (test.Status != LabTestStatus.Completed)
            throw new LabServiceException(ErrorMessages.ReportOnlyForCompletedTest);

        if (dto.File is null || dto.File.Length == 0)
            throw new LabServiceException("Report file is required.");

        // If a report already exists for this test, only block if its file is still
        // present on disk. Stale records left over from older uploads (where bytes
        // were never saved) get cleaned up so the tech can re-upload to recover.
        var existing = await _labReportRepository.GetByTestIdAsync(testId);
        if (existing is not null)
        {
            if (TryResolveStoredFilePath(existing, out var existingPath))
                throw new LabReportAlreadyExistsException(testId);
            await _labReportRepository.DeleteAsync(existing);
        }

        var (_, fullPath) = await SaveLabReportFileAsync(dto.File);

        var report = new LabReport
        {
            ReportID = IdGenerator.New(),
            TestID = testId,
            FileName = dto.File.FileName,
            // Store the absolute on-disk path so the download endpoint can read it
            // directly. The frontend never navigates to this value — downloads go
            // through GET /api/lab/tests/{id}/report/download.
            FileURI = fullPath,
            Notes = dto.Notes,
            Status = LabReportStatus.Uploaded,
            Date = DateTime.UtcNow
        };

        await _labReportRepository.AddAsync(report);
        return report.ToResponseDto();
    }

    // Writes the uploaded report into the configured local folder. Returns the
    // stored filename and the absolute on-disk path — the latter is what we
    // persist as FileURI so the download endpoint can read it back directly.
    private async Task<(string storedName, string fullPath)> SaveLabReportFileAsync(IFormFile file)
    {
        var folder = ResolveStorageFolder();
        Directory.CreateDirectory(folder);

        // Keep the original extension; prefix with a short ID so files never collide.
        var ext       = Path.GetExtension(file.FileName);
        var safeStem  = Path.GetFileNameWithoutExtension(file.FileName)
            .Replace(" ", "_");
        var storedName = $"{IdGenerator.New()}_{safeStem}{ext}";
        var destPath   = Path.Combine(folder, storedName);

        await using (var stream = File.Create(destPath))
        {
            await file.CopyToAsync(stream);
        }

        return (storedName, destPath);
    }

    private string ResolveStorageFolder()
    {
        var localPath = _configuration["LabReportStorage:LocalPath"]
            ?? "../MediCore.App/public/uploads/lab-reports";
        return Path.IsPathRooted(localPath)
            ? localPath
            : Path.GetFullPath(Path.Combine(_env.ContentRootPath, localPath));
    }

    public async Task<LabReportResponseDto> GetReportAsync(string testId)
    {
        _ = await _labTestRepository.GetByIdAsync(testId) ?? throw new LabTestNotFoundException(testId);
        var report = await _labReportRepository.GetByTestIdAsync(testId) ?? throw new LabReportNotFoundException(testId);
        return report.ToResponseDto();
    }

    public async Task<LabReportFileResult> DownloadReportAsync(string testId)
    {
        _ = await _labTestRepository.GetByIdAsync(testId) ?? throw new LabTestNotFoundException(testId);
        var report = await _labReportRepository.GetByTestIdAsync(testId)
            ?? throw new LabReportNotFoundException(testId);

        if (!TryResolveStoredFilePath(report, out var fullPath))
        {
            // Distinct from "no report record" — this is the legacy case where the
            // DB row exists but the file was never persisted. Surface a clear message
            // so the technician knows to re-upload.
            throw new LabServiceException(
                "The report file is missing on the server. Please ask the lab technician to upload it again.",
                404);
        }

        var provider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
        if (!provider.TryGetContentType(fullPath, out var contentType))
            contentType = "application/octet-stream";

        // FileShare.Read so concurrent downloads don't lock each other out.
        var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        var downloadName = string.IsNullOrWhiteSpace(report.FileName)
            ? Path.GetFileName(fullPath)
            : report.FileName;
        return new LabReportFileResult(stream, contentType, downloadName);
    }

    // Resolves the on-disk path for a report's stored file. New records save the
    // absolute path directly in FileURI; older records may hold a public URL or just
    // the bare filename — try each shape until we find a real file.
    private bool TryResolveStoredFilePath(LabReport report, out string fullPath)
    {
        fullPath = string.Empty;

        var fileRef = report.FileURI;
        if (string.IsNullOrWhiteSpace(fileRef)) return false;

        // 1) FileURI is already an absolute on-disk path (current format).
        if (Path.IsPathRooted(fileRef) && File.Exists(fileRef))
        {
            fullPath = fileRef;
            return true;
        }

        // 2) Legacy formats — derive the stored filename and look inside the
        // configured upload folder.
        string storedName;
        if (Uri.TryCreate(fileRef, UriKind.Absolute, out var uri) && uri.IsAbsoluteUri && !uri.IsFile)
        {
            var lastSeg = uri.Segments.LastOrDefault() ?? string.Empty;
            storedName = Uri.UnescapeDataString(lastSeg.TrimEnd('/'));
        }
        else
        {
            storedName = Path.GetFileName(fileRef);
        }

        if (string.IsNullOrWhiteSpace(storedName)) return false;

        var candidate = Path.Combine(ResolveStorageFolder(), storedName);
        if (File.Exists(candidate))
        {
            fullPath = candidate;
            return true;
        }

        return false;
    }
}
