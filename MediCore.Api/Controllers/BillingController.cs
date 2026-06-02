using MediCore.Api.DTOs;
using MediCore.Api.Services;
using MediCore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

// HTTP endpoints for bills, payments, and insurance claims.
// Authorization is per-method via [Authorize(Roles = ...)].
[ApiController]
[Route("api/billing")]
[Authorize]
public class BillingController : ControllerBase
{
    private readonly IBillingService _billingService;

    public BillingController(IBillingService billingService)
    {
        _billingService = billingService;
    }

    // ── BILL ──
    [HttpPost("bills")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Finance_Officer)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> CreateBill([FromBody] CreateBillRequestDto dto)
    {
        var result = await _billingService.CreateBillAsync(dto);
        return CreatedAtAction(nameof(GetBillById), new { id = result.BillID }, result);
    }

    [HttpGet("bills")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Finance_Officer)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> GetAllBills()
        => Ok(await _billingService.GetAllBillsAsync());

    [HttpGet("bills/{id}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Finance_Officer)},{nameof(RoleOption.Patient)},{nameof(RoleOption.Doctor)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> GetBillById(string id)
        => Ok(await _billingService.GetBillByIdAsync(id));

    [HttpGet("bills/patient/{patientId}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Finance_Officer)},{nameof(RoleOption.Patient)},{nameof(RoleOption.Doctor)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> GetBillsByPatient(string patientId)
        => Ok(await _billingService.GetBillsByPatientAsync(patientId));

    [HttpPut("bills/{id}/status")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Finance_Officer)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> UpdateBillStatus(string id, [FromBody] UpdateBillStatusRequestDto dto)
        => Ok(await _billingService.UpdateBillStatusAsync(id, dto));

    // ── PAYMENT ──
    [HttpPost("payments")]
    [Authorize(Roles = $"{nameof(RoleOption.Patient)},{nameof(RoleOption.Finance_Officer)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> MakePayment([FromBody] MakePaymentRequestDto dto)
    {
        var result = await _billingService.MakePaymentAsync(dto);
        return CreatedAtAction(nameof(GetPaymentById), new { id = result.PaymentID }, result);
    }

    [HttpGet("payments/{id}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Finance_Officer)},{nameof(RoleOption.Patient)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> GetPaymentById(string id)
        => Ok(await _billingService.GetPaymentByIdAsync(id));

    [HttpGet("payments/bill/{billId}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Finance_Officer)},{nameof(RoleOption.Patient)},{nameof(RoleOption.Doctor)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> GetPaymentsByBill(string billId)
        => Ok(await _billingService.GetPaymentsByBillAsync(billId));

    // ── CLAIM ──
    [HttpPost("claims")]
    [Authorize(Roles = $"{nameof(RoleOption.Patient)},{nameof(RoleOption.Finance_Officer)}")]
    public async Task<IActionResult> CreateClaim([FromBody] CreateInsuranceClaimRequestDto dto)
    {
        var result = await _billingService.CreateClaimAsync(dto);
        return CreatedAtAction(nameof(GetClaimById), new { id = result.ClaimID }, result);
    }

    [HttpGet("claims/{id}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Patient)},{nameof(RoleOption.Finance_Officer)}")]
    public async Task<IActionResult> GetClaimById(string id)
        => Ok(await _billingService.GetClaimByIdAsync(id));

    [HttpPut("claims/{id}/status")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Finance_Officer)}")]
    public async Task<IActionResult> UpdateClaimStatus(string id, [FromBody] UpdateClaimStatusRequestDto dto)
        => Ok(await _billingService.UpdateClaimStatusAsync(id, dto));
}
