using MediCore.Domain.Enums;

namespace MediCore.Domain.Entities;

public class Patient
{
    public string PatientID { get; set; } = null!;
    public DateOnly DOB { get; set; }
    public GenderOption Gender { get; set; }
    public string? Address { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? InsuranceID { get; set; }
    public bool Status { get; set; }

    public virtual ICollection<PatientDocument> Documents { get; set; } = new List<PatientDocument>();
}
