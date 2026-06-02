using MediCore.Api.DTOs;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;

namespace MediCore.Api.Mapper;

public static class AppointmentMappers
{
    // PatientID is set from the JWT in the service; Schedule is set from the resolved slot.
    public static Appointment ToEntity(this BookAppointmentRequestDto dto) => new()
    {
        AppointmentID = IdGenerator.New(),
        DoctorID = dto.DoctorID,
        Date = dto.Date,
        Time = dto.Time,
        Notes = dto.Notes,
        Status = AppointmentStatus.Pending,
        CreatedAt = DateTime.UtcNow
    };

    // Patient and Doctor user details are enriched in the service via IUserService.
    public static AppointmentResponseDto ToResponseDto(this Appointment e) => new()
    {
        AppointmentID = e.AppointmentID,
        Date = e.Date,
        Time = e.Time,
        Status = e.Status.ToString(),
        Notes = e.Notes,
        CreatedAt = e.CreatedAt
    };

    public static List<AppointmentResponseDto> ToResponseDtoList(this IEnumerable<Appointment> list)
        => list.Select(ToResponseDto).ToList();

    public static ScheduleResponseDto ToResponseDto(this Schedule e) => new()
    {
        ScheduleID = e.ScheduleID,
        DoctorID = e.DoctorID,
        Date = e.Date,
        TimeSlot = e.TimeSlot,
        Availability = e.Availability.ToString()
    };

    public static IEnumerable<ScheduleResponseDto> ToResponseDtoList(this IEnumerable<Schedule> list)
        => list.Select(ToResponseDto).ToList();
}
