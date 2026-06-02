using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface IScheduleRepository
{
    Task<Schedule?> GetByIdAsync(string scheduleId);
    Task<Schedule?> GetSlotAsync(string doctorId, DateOnly date, TimeOnly timeSlot);
    Task<IEnumerable<Schedule>> GetAvailableSlotsByDoctorAsync(string doctorId, DateOnly date);
    Task<IEnumerable<Schedule>> GetSchedulesByDoctorAsync(string doctorId, DateOnly date);
    Task AddAsync(Schedule schedule);
    Task UpdateAsync(Schedule schedule);
}
