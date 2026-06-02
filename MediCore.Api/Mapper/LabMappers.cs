using MediCore.Api.DTOs;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;

namespace MediCore.Api.Mapper;

public static class LabMappers
{
    // DoctorID is set from the JWT in the service.
    public static LabTest ToEntity(this CreateLabTestRequestDto dto) => new()
    {
        TestID = IdGenerator.New(),
        PatientID = dto.PatientID,
        Type = dto.Type,
        TechnicianID = dto.TechnicianId,
        Status = LabTestStatus.Requested,
        Date = DateTime.UtcNow
    };

    // Patient/Doctor/Technician user details are enriched in the service via IUserService.
    public static LabTestResponseDto ToResponseDto(this LabTest e) => new()
    {
        TestID = e.TestID,
        Type = e.Type.ToString(),
        Status = e.Status.ToString(),
        Date = e.Date,
        UpdatedAt = e.UpdatedAt,
        Report = e.Report?.ToResponseDto()
    };

    public static LabReportResponseDto ToResponseDto(this LabReport e) => new()
    {
        ReportID = e.ReportID,
        TestID = e.TestID,
        FileURI = e.FileURI,
        FileName = e.FileName,
        Notes = e.Notes,
        Status = e.Status.ToString(),
        Date = e.Date
    };
}
