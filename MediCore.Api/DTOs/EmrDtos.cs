using MediCore.Domain.Enums;

namespace MediCore.Api.DTOs;

public class CreateEMRRequestDto
{
    public string PatientID { get; set; } = string.Empty;
    public string Diagnosis { get; set; } = string.Empty;
    public string TreatmentPlan { get; set; } = string.Empty;
}

public class UpdateEMRRequestDto
{
    public string Diagnosis { get; set; } = string.Empty;
    public string TreatmentPlan { get; set; } = string.Empty;
    public EMRStatus Status { get; set; }
}

public class EMRResponseDto
{
    public string EMRID { get; set; } = string.Empty;
    public UserResponseDto? Patient { get; set; }
    public UserResponseDto? Doctor { get; set; }
    public string Diagnosis { get; set; } = string.Empty;
    public string TreatmentPlan { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public ICollection<PrescriptionResponseDto> Prescriptions { get; set; } = new List<PrescriptionResponseDto>();
}

public class AddPrescriptionRequestDto
{
    public string Medicine { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
}

public class PrescriptionResponseDto
{
    public string PrescriptionID { get; set; } = string.Empty;
    public string EMRID { get; set; } = string.Empty;
    public string DoctorID { get; set; } = string.Empty;
    public string Medicine { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
