using MediCore.Api.DTOs;
using MediCore.Api.Services;
using MediCore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

// Lab test workflow: doctors request → technicians accept/run → technicians
// upload reports. Patients can view their own results.
[ApiController]
[Route("api/lab")]
[Authorize]
public class LabController : ControllerBase
{
    private readonly ILabService _labService;

    public LabController(ILabService labService)
    {
        _labService = labService;
    }

    [HttpPost("tests")]
    [Authorize(Roles = nameof(RoleOption.Doctor))]
    public async Task<IActionResult> CreateTest([FromBody] CreateLabTestRequestDto dto)
    {
        var result = await _labService.CreateTestAsync(dto);
        return CreatedAtAction(nameof(GetTestById), new { id = result.TestID }, result);
    }

    [HttpGet("tests")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Doctor)},{nameof(RoleOption.Lab_Technician)},{nameof(RoleOption.Finance_Officer)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> GetAllTests()
        => Ok(await _labService.GetAllTestsAsync());

    [HttpGet("tests/{id}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Doctor)},{nameof(RoleOption.Lab_Technician)},{nameof(RoleOption.Patient)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> GetTestById(string id)
        => Ok(await _labService.GetTestByIdAsync(id));

    [HttpGet("tests/patient/{patientId}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Doctor)},{nameof(RoleOption.Lab_Technician)},{nameof(RoleOption.Patient)},{nameof(RoleOption.Finance_Officer)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> GetTestsByPatient(string patientId)
        => Ok(await _labService.GetTestsByPatientAsync(patientId));

    [HttpGet("tests/technician/{technicianId}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Lab_Technician)}")]
    public async Task<IActionResult> GetTestsByLabTechnician(string technicianId)
        => Ok(await _labService.GetTestsByLabTechnicianAsync(technicianId));

    [HttpPut("tests/{id}/assign")]
    [Authorize(Roles = nameof(RoleOption.Admin))]
    public async Task<IActionResult> AssignTechnician(string id, [FromBody] AssignTechnicianRequestDto dto)
        => Ok(await _labService.AssignTechnicianAsync(id, dto));

    [HttpPut("tests/{id}/status")]
    [Authorize(Roles = nameof(RoleOption.Lab_Technician))]
    public async Task<IActionResult> UpdateTestStatus(string id, [FromBody] UpdateLabTestStatusRequestDto dto)
        => Ok(await _labService.UpdateTestStatusAsync(id, dto));

    [HttpPost("tests/{id}/report")]
    [Authorize(Roles = nameof(RoleOption.Lab_Technician))]
    public async Task<IActionResult> UploadReport(string id, [FromForm] UploadLabReportRequestDto dto)
        => Created(string.Empty, await _labService.UploadReportAsync(id, dto));

    [HttpGet("tests/{id}/report")]
    [Authorize(Roles = $"{nameof(RoleOption.Doctor)},{nameof(RoleOption.Admin)},{nameof(RoleOption.Lab_Technician)},{nameof(RoleOption.Patient)}")]
    public async Task<IActionResult> GetReport(string id)
        => Ok(await _labService.GetReportAsync(id));

    // Streams the original file bytes back with the correct Content-Type and
    // a Content-Disposition that preserves the uploader's filename + extension.
    [HttpGet("tests/{id}/report/download")]
    [Authorize(Roles = $"{nameof(RoleOption.Doctor)},{nameof(RoleOption.Admin)},{nameof(RoleOption.Lab_Technician)},{nameof(RoleOption.Patient)}")]
    public async Task<IActionResult> DownloadReport(string id)
    {
        var file = await _labService.DownloadReportAsync(id);
        return File(file.Content, file.ContentType, file.DownloadName);
    }
}
