using MediCore.Api.DTOs;
using MediCore.Api.Services;
using MediCore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

// Doctor availability slots. Doctors create slots for upcoming dates; patients
// see only the available ones when booking an appointment.
[ApiController]
[Route("api/schedules")]
[Authorize]
public class ScheduleController : ControllerBase
{
    private readonly IScheduleService _scheduleService;

    public ScheduleController(IScheduleService scheduleService)
    {
        _scheduleService = scheduleService;
    }

    [HttpPost]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Doctor)}")]
    public async Task<IActionResult> CreateSlots([FromBody] CreateScheduleRequestDto dto)
    {
        await _scheduleService.CreateSlotsAsync(dto);
        return Ok(new { message = "Slots created successfully." });
    }

    [HttpGet("{doctorId}")]
    public async Task<IActionResult> GetAvailableSlots(string doctorId, [FromQuery] DateOnly date)
        => Ok(await _scheduleService.GetAvailableSlotsAsync(doctorId, date));

    // Returns the calling doctor's full schedule for a given date (both Available and Booked),
    // used by the schedule-creation UI to hide slots the doctor has already created.
    [HttpGet("mine")]
    [Authorize(Roles = nameof(RoleOption.Doctor))]
    public async Task<IActionResult> GetMyScheduleForDate([FromQuery] DateOnly date)
        => Ok(await _scheduleService.GetMySchedulesForDateAsync(date));
}
