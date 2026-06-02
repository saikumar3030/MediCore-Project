using MediCore.Api.DTOs;
using MediCore.Api.Services;
using MediCore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

// Book, reschedule, cancel, and complete appointments. Patients manage their
// own; doctors manage appointments assigned to them; admins see everything.
[ApiController]
[Route("api/appointments")]
[Authorize]
public class AppointmentController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;

    public AppointmentController(IAppointmentService appointmentService)
    {
        _appointmentService = appointmentService;
    }

    [HttpPost]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Patient)}")]
    public async Task<IActionResult> Book([FromBody] BookAppointmentRequestDto dto)
    {
        var result = await _appointmentService.BookAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.AppointmentID }, result);
    }

    [HttpGet]
    public async Task<IActionResult> GetMyAppointments()
        => Ok(await _appointmentService.GetMyAppointmentsAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var result = await _appointmentService.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("{id}/reschedule")]
    [Authorize(Roles = $"{nameof(RoleOption.Patient)},{nameof(RoleOption.Admin)}")]
    public async Task<IActionResult> Reschedule(string id, [FromBody] RescheduleRequestDto dto)
        => (await _appointmentService.RescheduleAsync(id, dto)) ? NoContent() : NotFound();

    [HttpPut("{id}/cancel")]
    [Authorize(Roles = nameof(RoleOption.Patient))]
    public async Task<IActionResult> Cancel(string id)
        => (await _appointmentService.CancelAsync(id)) ? NoContent() : NotFound();

    [HttpPut("{id}/complete")]
    [Authorize(Roles = nameof(RoleOption.Doctor))]
    public async Task<IActionResult> Complete(string id)
        => (await _appointmentService.CompleteAsync(id)) ? NoContent() : NotFound();

    [HttpDelete("{id}")]
    [Authorize(Roles = nameof(RoleOption.Admin))]
    public async Task<IActionResult> Delete(string id)
        => (await _appointmentService.DeleteAsync(id)) ? NoContent() : NotFound();
}
