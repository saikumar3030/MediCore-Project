using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MediCore.Domain.Enums;

namespace MediCore.Domain.Entities;

public class Schedule
{
    [Key]
    [Column(TypeName = "varchar(4)")]
    public string ScheduleID { get; set; } = string.Empty;
    public string DoctorID { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public TimeOnly TimeSlot { get; set; }
    public AvailabilityStatus Availability { get; set; } = AvailabilityStatus.Available;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
