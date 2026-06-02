using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class AppointmentRepository : IAppointmentRepository
{
    private readonly MediCoreDbContext _context;

    public AppointmentRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task<Appointment?> GetByIdAsync(string appointmentId)
        => await _context.Appointments
            .Include(a => a.Schedule)
            .FirstOrDefaultAsync(a => a.AppointmentID == appointmentId);

    public async Task<IEnumerable<Appointment>> GetByPatientIdAsync(string patientId)
        => await _context.Appointments
            .Include(a => a.Schedule)
            .Where(a => a.PatientID == patientId)
            .OrderByDescending(a => a.Date)
            .ToListAsync();

    public async Task<IEnumerable<Appointment>> GetByDoctorIdAsync(string doctorId)
        => await _context.Appointments
            .Include(a => a.Schedule)
            .Where(a => a.DoctorID == doctorId)
            .OrderByDescending(a => a.Date)
            .ToListAsync();

    public async Task AddAsync(Appointment appointment)
    {
        await _context.Appointments.AddAsync(appointment);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Appointment appointment)
    {
        appointment.UpdatedAt = DateTime.UtcNow;
        _context.Appointments.Update(appointment);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<Appointment>> GetAllAppointments()
        => await _context.Appointments.ToListAsync();

    public async Task DeleteAsync(Appointment appointment)
    {
        _context.Appointments.Remove(appointment);
        await _context.SaveChangesAsync();
    }
}
