using MediCore.Api.DTOs;
using MediCore.Api.Services;
using MediCore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

// HTTP endpoints for medicines, dispenses, and the issued-prescription queue.
// Authorization is per-method via [Authorize(Roles = ...)] — see each route.
[ApiController]
[Route("api/pharmacy")]
[Authorize]
public class PharmacyController : ControllerBase
{
    private readonly IPharmacyService _pharmacyService;

    public PharmacyController(IPharmacyService pharmacyService)
    {
        _pharmacyService = pharmacyService;
    }

    [HttpPost("medicines")]
    [Authorize(Roles = $"{nameof(RoleOption.Doctor)},{nameof(RoleOption.Pharmacist)},{nameof(RoleOption.Admin)}")]
    public async Task<IActionResult> AddMedicine([FromBody] AddMedicineRequestDto dto)
    {
        var result = await _pharmacyService.AddMedicineAsync(dto);
        return CreatedAtAction(nameof(GetMedicineById), new { id = result.MedicineID }, result);
    }

    [HttpGet("medicines")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Doctor)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> GetAllMedicines()
        => Ok(await _pharmacyService.GetAllMedicinesAsync());

    [HttpGet("medicines/{id}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Doctor)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> GetMedicineById(string id)
        => Ok(await _pharmacyService.GetMedicineByIdAsync(id));

    [HttpPut("medicines/{id}/stock")]
    [Authorize(Roles = nameof(RoleOption.Pharmacist))]
    public async Task<IActionResult> UpdateStock(string id, [FromBody] UpdateStockRequestDto dto)
        => Ok(await _pharmacyService.UpdateStockAsync(id, dto));

    [HttpPut("medicines/{id}/status")]
    [Authorize(Roles = nameof(RoleOption.Admin))]
    public async Task<IActionResult> UpdateMedicineStatus(string id, [FromBody] UpdateMedicineStatusRequestDto dto)
        => Ok(await _pharmacyService.UpdateMedicineStatusAsync(id, dto));

    [HttpPut("medicines/{id}/reactivate")]
    [Authorize(Roles = $"{nameof(RoleOption.Pharmacist)},{nameof(RoleOption.Admin)}")]
    public async Task<IActionResult> ReactivateMedicine(string id)
        => Ok(await _pharmacyService.ReactivateMedicineAsync(id));

    [HttpDelete("medicines/{id}")]
    [Authorize(Roles = nameof(RoleOption.Pharmacist))]
    public async Task<IActionResult> RemoveMedicine(string id)
        => Ok(await _pharmacyService.RemoveMedicineAsync(id));

    [HttpDelete("medicines/{id}/permanent")]
    [Authorize(Roles = nameof(RoleOption.Pharmacist))]
    public async Task<IActionResult> HardDeleteMedicine(string id)
    {
        await _pharmacyService.HardDeleteMedicineAsync(id);
        return NoContent();
    }

    [HttpPost("dispense")]
    [Authorize(Roles = nameof(RoleOption.Pharmacist))]
    public async Task<IActionResult> Dispense([FromBody] DispenseMedicineRequestDto dto)
    {
        var result = await _pharmacyService.DispenseMedicineAsync(dto);
        return CreatedAtAction(nameof(GetDispenseById), new { id = result.DispenseID }, result);
    }

    [HttpGet("dispense")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> GetAllDispenses()
        => Ok(await _pharmacyService.GetAllDispensesAsync());

    [HttpGet("dispense/{id}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Pharmacist)},{nameof(RoleOption.Doctor)}")]
    public async Task<IActionResult> GetDispenseById(string id)
        => Ok(await _pharmacyService.GetDispenseByIdAsync(id));

    [HttpGet("dispense/prescription/{prescriptionId}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Pharmacist)},{nameof(RoleOption.Doctor)}")]
    public async Task<IActionResult> GetDispenseByPrescription(string prescriptionId)
        => Ok(await _pharmacyService.GetDispenseByPrescriptionAsync(prescriptionId));

    [HttpGet("prescriptions/issued")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> GetIssuedPrescriptions()
        => Ok(await _pharmacyService.GetIssuedPrescriptionsAsync());
}
