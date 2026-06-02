using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MediCore.Domain.Enums;

namespace MediCore.Domain.Entities;

public class Payment
{
    [Key]
    [Column(TypeName = "varchar(4)")]
    public string PaymentID { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "varchar(4)")]
    public string BillID { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Required]
    public PaymentMethod Method { get; set; }

    [Required]
    public PaymentStatus Status { get; set; } = PaymentStatus.Completed;

    [MaxLength(200)]
    public string? TransactionRef { get; set; }

    public DateTime Date { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey(nameof(BillID))]
    public Bill Bill { get; set; } = null!;
}
