using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class ScheduleRepository : IScheduleRepository
{
    private readonly MediCoreDbContext _context;

    public ScheduleRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task<Schedule?> GetByIdAsync(string scheduleId)
        => await _context.Schedules.FirstOrDefaultAsync(s => s.ScheduleID == scheduleId);

    public async Task<Schedule?> GetSlotAsync(string doctorId, DateOnly date, TimeOnly timeSlot)
        => await _context.Schedules.FirstOrDefaultAsync(s =>
                s.DoctorID == doctorId &&
                s.Date == date &&
                s.TimeSlot == timeSlot);

    public async Task<IEnumerable<Schedule>> GetAvailableSlotsByDoctorAsync(string doctorId, DateOnly date)
        => await _context.Schedules
            .Where(s =>
                s.DoctorID == doctorId &&
                s.Date == date &&
                s.Availability == AvailabilityStatus.Available)
            .OrderBy(s => s.TimeSlot)
            .ToListAsync();

    public async Task<IEnumerable<Schedule>> GetSchedulesByDoctorAsync(string doctorId, DateOnly date)
        => await _context.Schedules
            .Where(s => s.DoctorID == doctorId && s.Date == date)
            .OrderBy(s => s.TimeSlot)
            .ToListAsync();

    public async Task AddAsync(Schedule schedule)
    {
        await _context.Schedules.AddAsync(schedule);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Schedule schedule)
    {
        schedule.UpdatedAt = DateTime.UtcNow;
        _context.Schedules.Update(schedule);
        await _context.SaveChangesAsync();
    }
}
