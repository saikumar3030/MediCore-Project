using MediCore.Domain.Enums;

namespace MediCore.Api.DTOs;

public class CreateLabTestRequestDto
{
    public string PatientID { get; set; } = string.Empty;
    public LabTestType Type { get; set; }
    public required string TechnicianId { get; set; }
}

public class AssignTechnicianRequestDto
{
    public string TechnicianID { get; set; } = string.Empty;
}

public class UpdateLabTestStatusRequestDto
{
    public LabTestStatus Status { get; set; }
}

public class UploadLabReportRequestDto
{
    public IFormFile File { get; set; } = null!;
    public string? Notes { get; set; }
}

public class LabTestResponseDto
{
    public string TestID { get; set; } = string.Empty;
    public UserResponseDto? Patient { get; set; }
    public UserResponseDto? Doctor { get; set; }
    public UserResponseDto? Technician { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public LabReportResponseDto? Report { get; set; }
}

public class LabReportResponseDto
{
    public string ReportID { get; set; } = string.Empty;
    public string TestID { get; set; } = string.Empty;
    public string FileURI { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime Date { get; set; }
}
