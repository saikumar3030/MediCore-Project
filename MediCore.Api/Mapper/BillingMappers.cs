using MediCore.Api.DTOs;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;

namespace MediCore.Api.Mapper;

public static class BillingMappers
{
    public static Bill ToEntity(this CreateBillRequestDto dto) => new()
    {
        BillID = IdGenerator.New(),
        PatientID = dto.PatientID,
        Amount = dto.Amount,
        PaidAmount = 0m,
        Description = dto.Description,
        Status = BillStatus.Draft,
        Date = DateTime.UtcNow
    };

    public static BillResponseDto ToResponseDto(this Bill e) => new()
    {
        BillID = e.BillID,
        PatientID = e.PatientID,
        Amount = e.Amount,
        PaidAmount = e.PaidAmount,
        Description = e.Description,
        Status = e.Status.ToString(),
        Date = e.Date,
        UpdatedAt = e.UpdatedAt,
        Payments = e.Payments?.Select(ToResponseDto).ToList() ?? new List<PaymentResponseDto>(),
        InsuranceClaims = e.InsuranceClaims?.Select(ToResponseDto).ToList() ?? new List<InsuranceClaimResponseDto>()
    };

    public static IEnumerable<BillResponseDto> ToResponseDtoList(this IEnumerable<Bill> bills)
        => bills.Select(ToResponseDto).ToList();

    // Bill is set by EF via BillID; not exposed on the DTO.
    public static Payment ToEntity(this MakePaymentRequestDto dto) => new()
    {
        PaymentID = IdGenerator.New(),
        BillID = dto.BillID,
        Amount = dto.Amount,
        Method = dto.Method,
        Status = PaymentStatus.Completed,
        TransactionRef = dto.TransactionRef,
        Date = DateTime.UtcNow
    };

    public static PaymentResponseDto ToResponseDto(this Payment e) => new()
    {
        PaymentID = e.PaymentID,
        BillID = e.BillID,
        Amount = e.Amount,
        Method = e.Method.ToString(),
        Status = e.Status.ToString(),
        TransactionRef = e.TransactionRef,
        Date = e.Date
    };

    public static IEnumerable<PaymentResponseDto> ToResponseDtoList(this IEnumerable<Payment> payments)
        => payments.Select(ToResponseDto).ToList();

    // PatientID is set from the JWT in the service.
    public static InsuranceClaim ToEntity(this CreateInsuranceClaimRequestDto dto) => new()
    {
        ClaimID = IdGenerator.New(),
        BillID = dto.BillID,
        InsuranceID = dto.InsuranceID,
        Amount = dto.Amount,
        Notes = dto.Notes,
        Status = ClaimStatus.Submitted,
        Date = DateTime.UtcNow
    };

    public static InsuranceClaimResponseDto ToResponseDto(this InsuranceClaim e) => new()
    {
        ClaimID = e.ClaimID,
        BillID = e.BillID,
        PatientID = e.PatientID,
        InsuranceID = e.InsuranceID,
        Amount = e.Amount,
        Status = e.Status.ToString(),
        Notes = e.Notes,
        Date = e.Date
    };

    public static IEnumerable<InsuranceClaimResponseDto> ToResponseDtoList(this IEnumerable<InsuranceClaim> claims)
        => claims.Select(ToResponseDto).ToList();
}
