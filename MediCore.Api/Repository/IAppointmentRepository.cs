using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface IAppointmentRepository
{
    Task<IEnumerable<Appointment>> GetAllAppointments();
    Task<Appointment?> GetByIdAsync(string appointmentId);
    Task<IEnumerable<Appointment>> GetByPatientIdAsync(string patientId);
    Task<IEnumerable<Appointment>> GetByDoctorIdAsync(string doctorId);
    Task AddAsync(Appointment appointment);
    Task UpdateAsync(Appointment appointment);
    Task DeleteAsync(Appointment appointment);
}
