using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MediCore.Domain.Enums;

namespace MediCore.Domain.Entities;

public class Prescription
{
    [Key]
    [Column(TypeName = "varchar(4)")]
    public string PrescriptionID { get; set; } = string.Empty;

    [Column(TypeName = "varchar(4)")]
    public string EMRID { get; set; } = string.Empty;
    public string DoctorID { get; set; } = string.Empty;
    public string Medicine { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public PrescriptionStatus Status { get; set; } = PrescriptionStatus.Issued;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public EMR EMR { get; set; } = null!;
}
