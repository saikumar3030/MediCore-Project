using MediCore.Api.DTOs;

namespace MediCore.Api.Services;

public interface IScheduleService
{
    Task CreateSlotsAsync(CreateScheduleRequestDto dto);
    Task<IEnumerable<ScheduleResponseDto>> GetAvailableSlotsAsync(string doctorId, DateOnly date);
    Task<IEnumerable<ScheduleResponseDto>> GetMySchedulesForDateAsync(DateOnly date);
}
