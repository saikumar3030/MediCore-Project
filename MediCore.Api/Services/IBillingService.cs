using MediCore.Api.DTOs;

namespace MediCore.Api.Services;

public interface IBillingService
{
    Task<BillResponseDto> CreateBillAsync(CreateBillRequestDto dto);
    Task<IEnumerable<BillResponseDto>> GetAllBillsAsync();
    Task<BillResponseDto> GetBillByIdAsync(string billId);
    Task<IEnumerable<BillResponseDto>> GetBillsByPatientAsync(string patientId);
    Task<BillResponseDto> UpdateBillStatusAsync(string billId, UpdateBillStatusRequestDto dto);

    Task<PaymentResponseDto> MakePaymentAsync(MakePaymentRequestDto dto);
    Task<IEnumerable<PaymentResponseDto>> GetPaymentsByBillAsync(string billId);
    Task<PaymentResponseDto> GetPaymentByIdAsync(string paymentId);

    Task<InsuranceClaimResponseDto> CreateClaimAsync(CreateInsuranceClaimRequestDto dto);
    Task<InsuranceClaimResponseDto> GetClaimByIdAsync(string claimId);
    Task<InsuranceClaimResponseDto> UpdateClaimStatusAsync(string claimId, UpdateClaimStatusRequestDto dto);
}
