using MediCore.Api.DTOs;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;

namespace MediCore.Api.Mapper;

public static class EmrMappers
{
    // DoctorID is set from the JWT in the service.
    public static EMR ToEntity(this CreateEMRRequestDto dto) => new()
    {
        EMRID = IdGenerator.New(),
        PatientID = dto.PatientID,
        Diagnosis = dto.Diagnosis,
        TreatmentPlan = dto.TreatmentPlan,
        Status = EMRStatus.Active,
        Date = DateTime.UtcNow
    };

    // Patient/Doctor user details are enriched in the service via IUserService.
    public static EMRResponseDto ToResponseDto(this EMR e) => new()
    {
        EMRID = e.EMRID,
        Diagnosis = e.Diagnosis,
        TreatmentPlan = e.TreatmentPlan,
        Status = e.Status.ToString(),
        Date = e.Date,
        UpdatedAt = e.UpdatedAt,
        Prescriptions = e.Prescriptions?.Select(ToResponseDto).ToList() ?? new List<PrescriptionResponseDto>()
    };

    // EMRID and DoctorID are set in the service.
    public static Prescription ToEntity(this AddPrescriptionRequestDto dto) => new()
    {
        PrescriptionID = IdGenerator.New(),
        Medicine = dto.Medicine,
        Dosage = dto.Dosage,
        Frequency = dto.Frequency,
        Duration = dto.Duration,
        Status = PrescriptionStatus.Issued,
        CreatedAt = DateTime.UtcNow
    };

    public static PrescriptionResponseDto ToResponseDto(this Prescription e) => new()
    {
        PrescriptionID = e.PrescriptionID,
        EMRID = e.EMRID,
        DoctorID = e.DoctorID,
        Medicine = e.Medicine,
        Dosage = e.Dosage,
        Frequency = e.Frequency,
        Duration = e.Duration,
        Status = e.Status.ToString(),
        CreatedAt = e.CreatedAt
    };

    public static IEnumerable<PrescriptionResponseDto> ToResponseDtoList(this IEnumerable<Prescription> list)
        => list.Select(ToResponseDto).ToList();
}
