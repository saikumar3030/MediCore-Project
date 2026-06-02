using MediCore.Api.DTOs;
using MediCore.Api.Services;
using MediCore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

// Electronic Medical Records (EMR) endpoints. An EMR holds a patient's diagnosis,
// treatment plan, and prescriptions for a single visit.
[ApiController]
[Route("api/emr")]
[Authorize]
public class EMRController : ControllerBase
{
    private readonly IEMRService _emrService;

    public EMRController(IEMRService emrService)
    {
        _emrService = emrService;
    }

    [HttpPost]
    [Authorize(Roles = nameof(RoleOption.Doctor))]
    public async Task<IActionResult> Create([FromBody] CreateEMRRequestDto dto)
    {
        var result = await _emrService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.EMRID }, result);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = $"{nameof(RoleOption.Doctor)},{nameof(RoleOption.Admin)},{nameof(RoleOption.Patient)}")]
    public async Task<IActionResult> GetById(string id)
        => Ok(await _emrService.GetByIdAsync(id));

    [HttpGet("patient/{patientId}")]
    [Authorize(Roles = $"{nameof(RoleOption.Doctor)},{nameof(RoleOption.Admin)},{nameof(RoleOption.Patient)},{nameof(RoleOption.Finance_Officer)},{nameof(RoleOption.Pharmacist)}")]
    public async Task<IActionResult> GetByPatientId(string patientId)
        => Ok(await _emrService.GetByPatientIdAsync(patientId));

    [HttpPut("{id}")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Doctor)},{nameof(RoleOption.Lab_Technician)}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateEMRRequestDto dto)
        => Ok(await _emrService.UpdateAsync(id, dto));

    [HttpPost("{id}/prescriptions")]
    [Authorize(Roles = nameof(RoleOption.Doctor))]
    public async Task<IActionResult> AddPrescription(string id, [FromBody] AddPrescriptionRequestDto dto)
        => Created(string.Empty, await _emrService.AddPrescriptionAsync(id, dto));

    [HttpGet("{id}/prescriptions")]
    [Authorize(Roles = $"{nameof(RoleOption.Doctor)},{nameof(RoleOption.Admin)},{nameof(RoleOption.Patient)}")]
    public async Task<IActionResult> GetPrescriptions(string id)
        => Ok(await _emrService.GetPrescriptionsAsync(id));
}
