using MediCore.Domain.Enums;

namespace MediCore.Api.DTOs;

public class CreateBillRequestDto
{
    public string PatientID { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Description { get; set; }
}

public class UpdateBillStatusRequestDto
{
    public BillStatus Status { get; set; }
}

public class BillResponseDto
{
    public string BillID { get; set; } = string.Empty;
    public string PatientID { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount => Amount - PaidAmount;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public ICollection<PaymentResponseDto> Payments { get; set; } = new List<PaymentResponseDto>();
    public ICollection<InsuranceClaimResponseDto> InsuranceClaims { get; set; } = new List<InsuranceClaimResponseDto>();
}

public class MakePaymentRequestDto
{
    public string BillID { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public string? TransactionRef { get; set; }
}

public class PaymentResponseDto
{
    public string PaymentID { get; set; } = string.Empty;
    public string BillID { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Method { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? TransactionRef { get; set; }
    public DateTime Date { get; set; }
}

public class CreateInsuranceClaimRequestDto
{
    public string BillID { get; set; } = string.Empty;
    public string InsuranceID { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Notes { get; set; }
}

public class UpdateClaimStatusRequestDto
{
    public ClaimStatus Status { get; set; }
    public string? Notes { get; set; }
}

public class InsuranceClaimResponseDto
{
    public string ClaimID { get; set; } = string.Empty;
    public string BillID { get; set; } = string.Empty;
    public string PatientID { get; set; } = string.Empty;
    public string InsuranceID { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime Date { get; set; }
}
