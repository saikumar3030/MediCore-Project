using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MediCore.Domain.Enums;

namespace MediCore.Domain.Entities;

public class Dispense
{
    [Key]
    [Column(TypeName = "varchar(4)")]
    public string DispenseID { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "varchar(4)")]
    public string MedicineID { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "varchar(4)")]
    public string PrescriptionID { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string PharmacistID { get; set; } = string.Empty;

    [Required]
    public int Quantity { get; set; }

    [Required]
    public DispenseStatus Status { get; set; } = DispenseStatus.Dispensed;

    public DateTime Date { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey(nameof(MedicineID))]
    public Medicine Medicine { get; set; } = null!;
}
