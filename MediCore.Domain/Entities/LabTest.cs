using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MediCore.Domain.Enums;

namespace MediCore.Domain.Entities;

public class LabTest
{
    [Key]
    [Column(TypeName = "varchar(4)")]
    public string TestID { get; set; } = string.Empty;
    public string PatientID { get; set; } = string.Empty;
    public string DoctorID { get; set; } = string.Empty;
    public string? TechnicianID { get; set; }
    public LabTestType Type { get; set; }
    public LabTestStatus Status { get; set; } = LabTestStatus.Requested;
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public LabReport? Report { get; set; }
}
