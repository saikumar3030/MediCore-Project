using System.Security.Claims;
using MediCore.Api.DTOs;
using MediCore.Api.Mapper;
using MediCore.Api.Repository;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;
using MediCore.Domain.Exceptions;

namespace MediCore.Api.Services;

public class ScheduleService : IScheduleService
{
    private readonly IScheduleRepository _scheduleRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ScheduleService(IScheduleRepository scheduleRepository, IHttpContextAccessor httpContextAccessor)
    {
        _scheduleRepository = scheduleRepository;
        _httpContextAccessor = httpContextAccessor;
    }

    private string GetDoctorIdFromToken()
        => _httpContextAccessor.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public async Task CreateSlotsAsync(CreateScheduleRequestDto dto)
    {
        var doctorId = GetDoctorIdFromToken();
        var now = DateTime.Now;

        if (dto.Date.ToDateTime(TimeOnly.MaxValue) < now ||
            dto.TimeSlots.Any(t => dto.Date.ToDateTime(t) < now))
        {
            throw new AppointmentException(ErrorMessages.CannotCreateScheduleInPast);
        }

        // Skip any time slots the doctor has already created for this date
        // so we don't insert duplicates (the same DoctorID + Date + TimeSlot would just stack).
        var existing = (await _scheduleRepository.GetSchedulesByDoctorAsync(doctorId, dto.Date))
            .Select(s => s.TimeSlot)
            .ToHashSet();

        foreach (var timeSlot in dto.TimeSlots.Where(t => !existing.Contains(t)))
        {
            var schedule = new Schedule
            {
                ScheduleID = IdGenerator.New(),
                DoctorID = doctorId,
                Date = dto.Date,
                TimeSlot = timeSlot,
                Availability = AvailabilityStatus.Available,
                CreatedAt = DateTime.UtcNow
            };
            await _scheduleRepository.AddAsync(schedule);
        }
    }

    public async Task<IEnumerable<ScheduleResponseDto>> GetAvailableSlotsAsync(string doctorId, DateOnly date)
    {
        var slots = await _scheduleRepository.GetAvailableSlotsByDoctorAsync(doctorId, date);
        return slots.ToResponseDtoList();
    }

    public async Task<IEnumerable<ScheduleResponseDto>> GetMySchedulesForDateAsync(DateOnly date)
    {
        var doctorId = GetDoctorIdFromToken();
        var slots = await _scheduleRepository.GetSchedulesByDoctorAsync(doctorId, date);
        return slots.ToResponseDtoList();
    }
}
