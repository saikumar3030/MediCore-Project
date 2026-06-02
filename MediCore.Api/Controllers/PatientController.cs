using MediCore.Api.DTOs;
using MediCore.Api.Services;
using MediCore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

// Patient profile data (DOB, gender, address, phone, insurance).
// User credentials live separately on the User row — see UserController.
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PatientController : ControllerBase
{
    private readonly IPatientService _patientService;

    public PatientController(IPatientService patientService)
    {
        _patientService = patientService;
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> AddPatient(RequestPatientDto dto)
    {
        await _patientService.AddPatientAsync(dto);
        return StatusCode(201, new { success = true, message = "Patient created successfully" });
    }

    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Finance_Officer)},{nameof(RoleOption.Pharmacist)}")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var patients = await _patientService.GetAllPatientAsync();
        return Ok(new
        {
            success = true,
            message = patients.Any() ? "Patients retrieved successfully" : "No patients found",
            data = patients
        });
    }

    [HttpGet("{patientId}")]
    public async Task<IActionResult> GetOne(string patientId)
    {
        var patient = await _patientService.GetByIdAsync(patientId);
        return Ok(new { success = true, message = "Patient retrieved successfully", data = patient });
    }

    [HttpDelete("{patientId}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Patient)}")]
    public async Task<IActionResult> Delete(string patientId)
    {
        await _patientService.DeletePatientAsync(patientId);
        return Ok("Patient deleted successfully.");
    }

    [HttpPut("{patientId}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Patient)}")]
    public async Task<IActionResult> Update(string patientId, UpdatePatientDto dto)
    {
        await _patientService.UpdateAsync(dto);
        return Ok(new { success = true, message = "Patient updated successfully" });
    }
}
