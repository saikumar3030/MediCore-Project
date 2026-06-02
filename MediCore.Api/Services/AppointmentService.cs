using System.Security.Claims;
using MediCore.Api.DTOs;
using MediCore.Api.Mapper;
using MediCore.Api.Repository;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;
using MediCore.Domain.Exceptions;

namespace MediCore.Api.Services;

public class AppointmentService : IAppointmentService
{
    private readonly IAppointmentRepository _appointmentRepository;
    private readonly IScheduleRepository _scheduleRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IUserService _userService;          // direct DI (replaces IIdentityServiceClient)
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AppointmentService(
        IAppointmentRepository appointmentRepository,
        IScheduleRepository scheduleRepository,
        IPatientRepository patientRepository,
        IUserService userService,
        IHttpContextAccessor httpContextAccessor)
    {
        _appointmentRepository = appointmentRepository;
        _scheduleRepository = scheduleRepository;
        _patientRepository = patientRepository;
        _userService = userService;
        _httpContextAccessor = httpContextAccessor;
    }

    private string GetUserIdFromToken()
        => _httpContextAccessor.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private string? GetRoleFromToken()
        => _httpContextAccessor.HttpContext!.User.FindFirstValue(ClaimTypes.Role);

    private static bool IsInPast(DateOnly date, TimeOnly time)
        => date.ToDateTime(time) < DateTime.Now;

    public async Task<AppointmentResponseDto> BookAsync(BookAppointmentRequestDto dto)
    {
        if (IsInPast(dto.Date, dto.Time))
            throw new AppointmentException(ErrorMessages.CannotBookPastSlot);

        var slot = await _scheduleRepository.GetSlotAsync(dto.DoctorID, dto.Date, dto.Time)
            ?? throw new AppointmentException(ErrorMessages.SlotNotAvailable);

        var appointment = dto.ToEntity();
        appointment.PatientID = GetUserIdFromToken();
        appointment.Schedule = slot;

        await _appointmentRepository.AddAsync(appointment);

        slot.Availability = AvailabilityStatus.Booked;
        await _scheduleRepository.UpdateAsync(slot);

        // Enrich Patient/Doctor user info so the frontend can render the new row
        // immediately (without re-fetching the list).
        var responseDto = appointment.ToResponseDto();
        await EnrichAsync(responseDto, appointment);
        return responseDto;
    }

    public async Task<IEnumerable<AppointmentResponseDto>> GetMyAppointmentsAsync()
    {
        var userId = GetUserIdFromToken();
        var rawRole = GetRoleFromToken()?.Trim() ?? string.Empty;

        // Parse the role claim into the RoleOption enum so we don't depend on the exact
        // surface form (case, whitespace, or even a numeric value all work).
        if (!Enum.TryParse<RoleOption>(rawRole, ignoreCase: true, out var role))
        {
            throw new AppointmentException(
                $"{ErrorMessages.AppointmentEndpointRestricted} (unknown role '{rawRole}')");
        }

        IEnumerable<Appointment> appointments;

        switch (role)
        {
            case RoleOption.Patient:
                var patient = await _patientRepository.GetByIdAsync(userId)
                    ?? throw new AppointmentException(ErrorMessages.PatientProfileNotFoundForUser);
                appointments = await _appointmentRepository.GetByPatientIdAsync(patient.PatientID);
                break;

            case RoleOption.Doctor:
                appointments = await _appointmentRepository.GetByDoctorIdAsync(userId);
                break;

            // Billers (Admin / Finance / Pharmacist) need every appointment so the
            // New Bill checklist can show what each patient owes for.
            case RoleOption.Admin:
            case RoleOption.Finance_Officer:
            case RoleOption.Pharmacist:
                appointments = await _appointmentRepository.GetAllAppointments();
                break;

            default:
                throw new AppointmentException(ErrorMessages.AppointmentEndpointRestricted);
        }

        var list = appointments.ToList();
        var dtos = list.ToResponseDtoList();

        for (int i = 0; i < list.Count; i++)
            await EnrichAsync(dtos[i], list[i]);

        return dtos;
    }

    public async Task<AppointmentResponseDto?> GetByIdAsync(string appointmentId)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(appointmentId);
        if (appointment is null) return null;

        var dto = appointment.ToResponseDto();
        await EnrichAsync(dto, appointment);
        return dto;
    }

    private async Task EnrichAsync(AppointmentResponseDto dto, Appointment appointment)
    {
        try { dto.Patient = await _userService.GetByIdAsync(appointment.PatientID); }
        catch (IdentityServiceException) { }
        try { dto.Doctor = await _userService.GetByIdAsync(appointment.DoctorID); }
        catch (IdentityServiceException) { }
    }

    public async Task<bool> RescheduleAsync(string appointmentId, RescheduleRequestDto dto)
    {
        if (IsInPast(dto.NewDate, dto.NewTime))
            throw new AppointmentException(ErrorMessages.CannotRescheduleToPastSlot);

        var appointment = await _appointmentRepository.GetByIdAsync(appointmentId);
        if (appointment is null) return false;

        var role = GetRoleFromToken();
        if (role != nameof(RoleOption.Admin) && appointment.PatientID != GetUserIdFromToken())
            throw new UnauthorizedAccessException(ErrorMessages.CanOnlyRescheduleOwnAppointments);

        var oldSlot = await _scheduleRepository.GetSlotAsync(appointment.DoctorID, appointment.Date, appointment.Time);
        if (oldSlot is not null)
        {
            oldSlot.Availability = AvailabilityStatus.Available;
            await _scheduleRepository.UpdateAsync(oldSlot);
        }

        var newSlot = await _scheduleRepository.GetSlotAsync(appointment.DoctorID, dto.NewDate, dto.NewTime)
            ?? throw new AppointmentException(ErrorMessages.NewSlotNotAvailable);

        appointment.Date = dto.NewDate;
        appointment.Time = dto.NewTime;
        appointment.Status = AppointmentStatus.Pending;
        await _appointmentRepository.UpdateAsync(appointment);

        newSlot.Availability = AvailabilityStatus.Booked;
        await _scheduleRepository.UpdateAsync(newSlot);
        return true;
    }

    public async Task<bool> CancelAsync(string appointmentId)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(appointmentId);
        if (appointment is null) return false;

        var userId = GetUserIdFromToken();
        var role = GetRoleFromToken();

        if (role == nameof(RoleOption.Patient))
        {
            var patient = await _patientRepository.GetByIdAsync(userId)
                ?? throw new AppointmentException(ErrorMessages.PatientProfileNotFoundForUser);
            if (appointment.PatientID != patient.PatientID)
                throw new UnauthorizedAccessException(ErrorMessages.CanOnlyCancelOwnAppointments);
        }

        var slot = await _scheduleRepository.GetSlotAsync(appointment.DoctorID, appointment.Date, appointment.Time);
        if (slot is not null)
        {
            slot.Availability = AvailabilityStatus.Available;
            await _scheduleRepository.UpdateAsync(slot);
        }

        appointment.Status = AppointmentStatus.Cancelled;
        await _appointmentRepository.UpdateAsync(appointment);
        return true;
    }

    public async Task<bool> CompleteAsync(string appointmentId)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(appointmentId);
        if (appointment is null) return false;

        if (appointment.DoctorID != GetUserIdFromToken())
            throw new UnauthorizedAccessException(ErrorMessages.CanOnlyCompleteOwnAppointments);

        appointment.Status = AppointmentStatus.Completed;
        await _appointmentRepository.UpdateAsync(appointment);
        return true;
    }

    public async Task<bool> DeleteAsync(string appointmentId)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(appointmentId);
        if (appointment is null) return false;

        var slot = await _scheduleRepository.GetSlotAsync(appointment.DoctorID, appointment.Date, appointment.Time);
        if (slot is not null)
        {
            slot.Availability = AvailabilityStatus.Available;
            await _scheduleRepository.UpdateAsync(slot);
        }

        await _appointmentRepository.DeleteAsync(appointment);
        return true;
    }
}
