using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MediCore.Domain.Enums;

namespace MediCore.Domain.Entities;

public class InsuranceClaim
{
    [Key]
    [Column(TypeName = "varchar(4)")]
    public string ClaimID { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "varchar(4)")]
    public string BillID { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string PatientID { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string InsuranceID { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Required]
    public ClaimStatus Status { get; set; } = ClaimStatus.Submitted;

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime Date { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey(nameof(BillID))]
    public Bill Bill { get; set; } = null!;
}
