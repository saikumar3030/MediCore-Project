using MediCore.Api.DTOs;
using MediCore.Api.Mapper;
using MediCore.Api.Repository;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;
using MediCore.Domain.Exceptions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace MediCore.Api.Services;

public class PatientDocumentService : IPatientDocumentService
{
    private readonly IPatientDocumentRepository _repository;
    private readonly IWebHostEnvironment _env;
    private readonly IHttpContextAccessor _httpContextAccessor;

    // Files larger than this are rejected up-front (avoids spending IO/CPU on
    // huge uploads before validating). Adjust if you need scanned multi-page
    // documents bigger than ~10 MB.
    private const long MaxFileSizeBytes = 10 * 1024 * 1024;

    private static readonly string[] AllowedExtensions =
        { ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic" };

    public PatientDocumentService(
        IPatientDocumentRepository repository,
        IWebHostEnvironment env,
        IHttpContextAccessor httpContextAccessor)
    {
        _repository = repository;
        _env = env;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task DeleteDocumentAsync(string documentId)
    {
        var doc = await _repository.GetDocumentByIdAsync(documentId)
            ?? throw new PatientException(ErrorMessages.PatientDocumentNotFound, 404);

        // Best-effort disk cleanup. Failure to delete the file should NOT stop
        // the DB row removal — orphaned files can be cleaned later, but a
        // stuck DB row leaves the patient with a phantom document.
        TryDeletePhysicalFile(doc.FileURI);

        await _repository.DeleteDocumentAsync(documentId);
    }

    public async Task<IEnumerable<ResponsePatientDocumentDto>> GetAllDocumentAsync()
    {
        var docs = await _repository.GetAllDocumentAsync();
        return docs.ToResponseDtoList();
    }

    public async Task<ResponsePatientDocumentDto?> GetDocumentByIdAsync(string documentId)
    {
        var doc = await _repository.GetDocumentByIdAsync(documentId)
            ?? throw new PatientException(ErrorMessages.PatientDocumentNotFound, 404);
        return doc.ToResponseDto();
    }

    public async Task<ResponsePatientDocumentDto> UploadDocumentAsync(
        string patientId, int docType, IFormFile file)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            throw new PatientException("Patient ID is required.", 400);

        if (file == null || file.Length == 0)
            throw new PatientException("No file was provided.", 400);

        if (file.Length > MaxFileSizeBytes)
            throw new PatientException(
                $"File exceeds the {MaxFileSizeBytes / (1024 * 1024)} MB limit.", 400);

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            throw new PatientException(
                $"File type '{ext}' is not allowed. Allowed: {string.Join(", ", AllowedExtensions)}.",
                400);

        if (!Enum.IsDefined(typeof(DocTypeOption), docType))
            throw new PatientException("Invalid document type.", 400);

        // Persist under wwwroot/uploads/patient-documents/{patientId}/
        // Filename uses the new DocumentID so collisions are impossible.
        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var patientFolder = Path.Combine(webRoot, "uploads", "patient-documents", patientId);
        Directory.CreateDirectory(patientFolder);

        var documentId = IdGenerator.New();
        var storedFileName = $"{documentId}{ext}";
        var diskPath = Path.Combine(patientFolder, storedFileName);

        await using (var stream = File.Create(diskPath))
        {
            await file.CopyToAsync(stream);
        }

        // FileURI is the absolute URL the frontend can hit to download/view.
        var request = _httpContextAccessor.HttpContext?.Request;
        var baseUrl = request != null
            ? $"{request.Scheme}://{request.Host}"
            : string.Empty;
        var fileUri = $"{baseUrl}/uploads/patient-documents/{patientId}/{storedFileName}";

        var entity = new PatientDocument
        {
            DocumentID = documentId,
            PatientID = patientId,
            DocType = (DocTypeOption)docType,
            FileURI = fileUri,
            FileName = file.FileName,
            UploadedDate = DateTime.UtcNow
        };

        await _repository.UploadDocumentAsync(entity);
        return entity.ToResponseDto();
    }

    public async Task<IEnumerable<ResponsePatientDocumentDto>> GetDocumentsByPatientIdAsync(string patientId)
    {
        var docs = await _repository.GetDocumentsByPatientIdAsync(patientId);
        return docs.ToResponseDtoList();
    }

    private void TryDeletePhysicalFile(string fileUri)
    {
        if (string.IsNullOrWhiteSpace(fileUri)) return;
        try
        {
            // Strip scheme/host: extract path portion only.
            var pathPart = fileUri;
            var idx = fileUri.IndexOf("/uploads/", StringComparison.OrdinalIgnoreCase);
            if (idx >= 0) pathPart = fileUri[idx..];

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var fullPath = Path.Combine(webRoot, pathPart.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(fullPath)) File.Delete(fullPath);
        }
        catch
        {
            // Swallow — file cleanup is best-effort.
        }
    }
}
