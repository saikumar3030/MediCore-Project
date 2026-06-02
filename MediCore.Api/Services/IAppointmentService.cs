using MediCore.Api.DTOs;

namespace MediCore.Api.Services;

public interface IAppointmentService
{
    Task<AppointmentResponseDto> BookAsync(BookAppointmentRequestDto dto);
    Task<IEnumerable<AppointmentResponseDto>> GetMyAppointmentsAsync();
    Task<AppointmentResponseDto?> GetByIdAsync(string appointmentId);
    Task<bool> RescheduleAsync(string appointmentId, RescheduleRequestDto dto);
    Task<bool> CancelAsync(string appointmentId);
    Task<bool> CompleteAsync(string appointmentId);
    Task<bool> DeleteAsync(string appointmentId);
}
