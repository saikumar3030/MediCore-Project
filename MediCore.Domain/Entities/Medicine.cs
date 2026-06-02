using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MediCore.Domain.Enums;

namespace MediCore.Domain.Entities;

public class Medicine
{
    [Key]
    [Column(TypeName = "varchar(4)")]
    public string MedicineID { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public MedicineType Type { get; set; }

    [Required]
    public int Stock { get; set; } = 0;

    [Required]
    public DateOnly ExpiryDate { get; set; }

    [Required]
    public MedicineStatus Status { get; set; } = MedicineStatus.Active;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<Dispense> Dispenses { get; set; } = new List<Dispense>();
}
