namespace MediCore.Api.DTOs;

public class BookAppointmentRequestDto
{
    public string DoctorID { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public TimeOnly Time { get; set; }
    public string? Notes { get; set; }
}

public class RescheduleRequestDto
{
    public DateOnly NewDate { get; set; }
    public TimeOnly NewTime { get; set; }
}

public class AppointmentResponseDto
{
    public string AppointmentID { get; set; } = string.Empty;
    public UserResponseDto? Patient { get; set; }
    public UserResponseDto? Doctor { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly Time { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateScheduleRequestDto
{
    public DateOnly Date { get; set; }
    public List<TimeOnly> TimeSlots { get; set; } = new();
}

public class ScheduleResponseDto
{
    public string ScheduleID { get; set; } = string.Empty;
    public string DoctorID { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public TimeOnly TimeSlot { get; set; }
    public string Availability { get; set; } = string.Empty;
}
