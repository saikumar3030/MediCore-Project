using MediCore.Api.DTOs;

namespace MediCore.Api.Services;

public interface ILabService
{
    Task<LabTestResponseDto> CreateTestAsync(CreateLabTestRequestDto dto);
    Task<IEnumerable<LabTestResponseDto>> GetAllTestsAsync();
    Task<LabTestResponseDto> GetTestByIdAsync(string testId);
    Task<IEnumerable<LabTestResponseDto>> GetTestsByPatientAsync(string patientId);
    Task<IEnumerable<LabTestResponseDto>> GetTestsByLabTechnicianAsync(string technicianId);
    Task<LabTestResponseDto> AssignTechnicianAsync(string testId, AssignTechnicianRequestDto dto);
    Task<LabTestResponseDto> UpdateTestStatusAsync(string testId, UpdateLabTestStatusRequestDto dto);
    Task<LabReportResponseDto> UploadReportAsync(string testId, UploadLabReportRequestDto dto);
    Task<LabReportResponseDto> GetReportAsync(string testId);
    Task<LabReportFileResult> DownloadReportAsync(string testId);
}

// Wraps an open file stream so the controller can return it as a FileStreamResult
// without LabService having to depend on ASP.NET Core MVC types.
public sealed record LabReportFileResult(Stream Content, string ContentType, string DownloadName);
