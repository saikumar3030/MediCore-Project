using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MediCore.Domain.Enums;

namespace MediCore.Domain.Entities;

public class EMR
{
    [Key]
    [Column(TypeName = "varchar(4)")]
    public string EMRID { get; set; } = string.Empty;
    public string PatientID { get; set; } = string.Empty;
    public string DoctorID { get; set; } = string.Empty;
    public string Diagnosis { get; set; } = string.Empty;
    public string TreatmentPlan { get; set; } = string.Empty;
    public EMRStatus Status { get; set; } = EMRStatus.Active;
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();
}
