using System.Security.Claims;
using MediCore.Api.DTOs;
using MediCore.Api.Mapper;
using MediCore.Api.Repository;
using MediCore.Api.Utilities;
using MediCore.Domain.Enums;
using MediCore.Domain.Exceptions;

namespace MediCore.Api.Services;

public class BillingService : IBillingService
{
    private readonly IBillRepository _billRepository;
    private readonly IPaymentRepository _paymentRepository;
    private readonly IInsuranceClaimRepository _claimRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public BillingService(
        IBillRepository billRepository,
        IPaymentRepository paymentRepository,
        IInsuranceClaimRepository claimRepository,
        IHttpContextAccessor httpContextAccessor)
    {
        _billRepository = billRepository;
        _paymentRepository = paymentRepository;
        _claimRepository = claimRepository;
        _httpContextAccessor = httpContextAccessor;
    }

    private string GetUserIdFromToken()
        => _httpContextAccessor.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // ── BILL ──────────────────────────────────
    public async Task<BillResponseDto> CreateBillAsync(CreateBillRequestDto dto)
    {
        if (dto.Amount <= 0)
            throw new BillingServiceException(ErrorMessages.BillAmountMustBePositive);

        var bill = dto.ToEntity();
        await _billRepository.AddAsync(bill);
        return bill.ToResponseDto();
    }

    public async Task<IEnumerable<BillResponseDto>> GetAllBillsAsync()
        => (await _billRepository.GetAllAsync()).ToResponseDtoList();

    public async Task<BillResponseDto> GetBillByIdAsync(string billId)
    {
        var bill = await _billRepository.GetByIdAsync(billId) ?? throw new BillNotFoundException(billId);
        return bill.ToResponseDto();
    }

    public async Task<IEnumerable<BillResponseDto>> GetBillsByPatientAsync(string patientId)
        => (await _billRepository.GetByPatientIdAsync(patientId)).ToResponseDtoList();

    public async Task<BillResponseDto> UpdateBillStatusAsync(string billId, UpdateBillStatusRequestDto dto)
    {
        var bill = await _billRepository.GetByIdAsync(billId) ?? throw new BillNotFoundException(billId);
        bill.Status = dto.Status;
        await _billRepository.UpdateAsync(bill);
        return bill.ToResponseDto();
    }

    // ── PAYMENT ───────────────────────────────
    // Adds a payment and bumps Bill.PaidAmount.
    // Bill is flipped to Paid if it's now fully covered, else PartiallyPaid.
    // Rejects payments larger than the remaining balance.
    public async Task<PaymentResponseDto> MakePaymentAsync(MakePaymentRequestDto dto)
    {
        var bill = await _billRepository.GetByIdAsync(dto.BillID) ?? throw new BillNotFoundException(dto.BillID);

        if (bill.Status == BillStatus.Paid) throw new BillAlreadyPaidException(dto.BillID);
        if (bill.Status == BillStatus.Cancelled) throw new BillCancelledException(dto.BillID);
        if (dto.Amount <= 0) throw new BillingServiceException(ErrorMessages.PaymentAmountMustBePositive);

        var remaining = bill.Amount - bill.PaidAmount;
        if (dto.Amount > remaining) throw new OverpaymentException(remaining);

        var payment = dto.ToEntity();
        await _paymentRepository.AddAsync(payment);

        bill.PaidAmount += dto.Amount;
        bill.Status = bill.PaidAmount >= bill.Amount ? BillStatus.Paid : BillStatus.PartiallyPaid;
        await _billRepository.UpdateAsync(bill);

        return payment.ToResponseDto();
    }

    public async Task<IEnumerable<PaymentResponseDto>> GetPaymentsByBillAsync(string billId)
    {
        _ = await _billRepository.GetByIdAsync(billId) ?? throw new BillNotFoundException(billId);
        return (await _paymentRepository.GetByBillIdAsync(billId)).ToResponseDtoList();
    }

    public async Task<PaymentResponseDto> GetPaymentByIdAsync(string paymentId)
    {
        var p = await _paymentRepository.GetByIdAsync(paymentId) ?? throw new PaymentNotFoundException(paymentId);
        return p.ToResponseDto();
    }

    // ── CLAIM ─────────────────────────────────
    public async Task<InsuranceClaimResponseDto> CreateClaimAsync(CreateInsuranceClaimRequestDto dto)
    {
        var bill = await _billRepository.GetByIdAsync(dto.BillID) ?? throw new BillNotFoundException(dto.BillID);

        if (bill.Status == BillStatus.Paid)
            throw new BillingServiceException(ErrorMessages.CannotClaimFullyPaidBill);
        if (bill.Status == BillStatus.Cancelled)
            throw new BillCancelledException(dto.BillID);
        if (dto.Amount <= 0 || dto.Amount > bill.Amount)
            throw new BillingServiceException(ErrorMessages.ClaimAmountOutOfRange(bill.Amount));

        if (await _claimRepository.GetActiveclaimByBillIdAsync(dto.BillID) is not null)
            throw new DuplicateClaimException(dto.BillID);

        var claim = dto.ToEntity();
        claim.PatientID = GetUserIdFromToken();
        await _claimRepository.AddAsync(claim);
        return claim.ToResponseDto();
    }

    public async Task<InsuranceClaimResponseDto> GetClaimByIdAsync(string claimId)
    {
        var claim = await _claimRepository.GetByIdAsync(claimId) ?? throw new ClaimNotFoundException(claimId);
        return claim.ToResponseDto();
    }

    // Updates claim status; when a claim is Settled, the claim amount counts
    // toward Bill.PaidAmount (insurance pays part of the bill).
    public async Task<InsuranceClaimResponseDto> UpdateClaimStatusAsync(string claimId, UpdateClaimStatusRequestDto dto)
    {
        var claim = await _claimRepository.GetByIdAsync(claimId) ?? throw new ClaimNotFoundException(claimId);

        claim.Status = dto.Status;
        claim.Notes = dto.Notes ?? claim.Notes;

        if (dto.Status == ClaimStatus.Settled)
        {
            var bill = await _billRepository.GetByIdAsync(claim.BillID) ?? throw new BillNotFoundException(claim.BillID);
            bill.PaidAmount += claim.Amount;
            bill.Status = bill.PaidAmount >= bill.Amount ? BillStatus.Paid : BillStatus.PartiallyPaid;
            await _billRepository.UpdateAsync(bill);
        }

        await _claimRepository.UpdateAsync(claim);
        return claim.ToResponseDto();
    }
}
