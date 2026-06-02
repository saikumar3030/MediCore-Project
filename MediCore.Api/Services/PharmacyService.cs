using System.Security.Claims;
using MediCore.Api.DTOs;
using MediCore.Api.Mapper;
using MediCore.Api.Repository;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;
using MediCore.Domain.Exceptions;

namespace MediCore.Api.Services;

public class PharmacyService : IPharmacyService
{
    private readonly IMedicineRepository _medicineRepository;
    private readonly IDispenseRepository _dispenseRepository;
    private readonly IPrescriptionRepository _prescriptionRepository;
    private readonly IUserRepository _userRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public PharmacyService(
        IMedicineRepository medicineRepository,
        IDispenseRepository dispenseRepository,
        IPrescriptionRepository prescriptionRepository,
        IUserRepository userRepository,
        IHttpContextAccessor httpContextAccessor)
    {
        _medicineRepository = medicineRepository;
        _dispenseRepository = dispenseRepository;
        _prescriptionRepository = prescriptionRepository;
        _userRepository = userRepository;
        _httpContextAccessor = httpContextAccessor;
    }

    private string GetUserIdFromToken()
        => _httpContextAccessor.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public async Task<MedicineResponseDto> AddMedicineAsync(AddMedicineRequestDto dto)
    {
        var medicine = dto.ToEntity();
        await _medicineRepository.AddAsync(medicine);
        return medicine.ToResponseDto();
    }

    public async Task<IEnumerable<MedicineResponseDto>> GetAllMedicinesAsync()
    {
        var medicines = (await _medicineRepository.GetAllAsync()).ToList();
        await AutoExpireAsync(medicines);
        return medicines.ToResponseDtoList();
    }

    public async Task<MedicineResponseDto> GetMedicineByIdAsync(string medicineId)
    {
        var m = await _medicineRepository.GetByIdAsync(medicineId) ?? throw new MedicineNotFoundException(medicineId);
        await AutoExpireAsync(new[] { m });
        return m.ToResponseDto();
    }

    // Auto-flips past-expiry medicines to Inactive on every read, so the
    // stored status stays in sync with reality without admin intervention.
    private async Task AutoExpireAsync(IEnumerable<Medicine> medicines)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        foreach (var m in medicines)
        {
            if (m.ExpiryDate < today && m.Status != MedicineStatus.Inactive)
            {
                m.Status = MedicineStatus.Inactive;
                await _medicineRepository.UpdateAsync(m);
            }
        }
    }

    public async Task<MedicineResponseDto> UpdateStockAsync(string medicineId, UpdateStockRequestDto dto)
    {
        var medicine = await _medicineRepository.GetByIdAsync(medicineId) ?? throw new MedicineNotFoundException(medicineId);
        if (dto.Quantity <= 0)
            throw new PharmacyServiceException(ErrorMessages.StockQuantityMustBePositive);

        medicine.Stock += dto.Quantity;
        if (medicine.Status == MedicineStatus.OutOfStock)
            medicine.Status = MedicineStatus.Active;

        await _medicineRepository.UpdateAsync(medicine);
        return medicine.ToResponseDto();
    }

    public async Task<MedicineResponseDto> UpdateMedicineStatusAsync(string medicineId, UpdateMedicineStatusRequestDto dto)
    {
        var medicine = await _medicineRepository.GetByIdAsync(medicineId) ?? throw new MedicineNotFoundException(medicineId);
        medicine.Status = dto.Status;
        await _medicineRepository.UpdateAsync(medicine);
        return medicine.ToResponseDto();
    }

    // Inactive → Active. Refuses if past expiry. Idempotent for already-Active rows.
    public async Task<MedicineResponseDto> ReactivateMedicineAsync(string medicineId)
    {
        var medicine = await _medicineRepository.GetByIdAsync(medicineId) ?? throw new MedicineNotFoundException(medicineId);

        if (medicine.ExpiryDate < DateOnly.FromDateTime(DateTime.UtcNow))
            throw new PharmacyServiceException(ErrorMessages.CannotReactivateExpiredMedicine);

        if (medicine.Status == MedicineStatus.Inactive)
        {
            medicine.Status = MedicineStatus.Active;
            await _medicineRepository.UpdateAsync(medicine);
        }
        return medicine.ToResponseDto();
    }

    // Soft-delete: flip to Inactive. Keeps Dispense FK references + audit trail intact.
    public async Task<MedicineResponseDto> RemoveMedicineAsync(string medicineId)
    {
        var medicine = await _medicineRepository.GetByIdAsync(medicineId) ?? throw new MedicineNotFoundException(medicineId);
        if (medicine.Status != MedicineStatus.Inactive)
        {
            medicine.Status = MedicineStatus.Inactive;
            await _medicineRepository.UpdateAsync(medicine);
        }
        return medicine.ToResponseDto();
    }

    // Permanent delete. Requires the row already be Inactive AND have no dispense
    // history — once dispensed, a medicine row must live forever to preserve the
    // audit trail.
    public async Task HardDeleteMedicineAsync(string medicineId)
    {
        var medicine = await _medicineRepository.GetByIdAsync(medicineId) ?? throw new MedicineNotFoundException(medicineId);

        if (medicine.Status != MedicineStatus.Inactive)
            throw new PharmacyServiceException(ErrorMessages.MedicineMustBeInactiveToHardDelete);

        if (await _dispenseRepository.HasDispensesForMedicineAsync(medicineId))
            throw new PharmacyServiceException(ErrorMessages.MedicineHasDispenseHistory, 409);

        await _medicineRepository.RemoveAsync(medicine);
    }

    public async Task<DispenseResponseDto> DispenseMedicineAsync(DispenseMedicineRequestDto dto)
    {
        var medicine = await _medicineRepository.GetByIdAsync(dto.MedicineID) ?? throw new MedicineNotFoundException(dto.MedicineID);

        if (medicine.Status == MedicineStatus.Inactive)
            throw new PharmacyServiceException(ErrorMessages.MedicineInactive(medicine.Name));

        if (medicine.ExpiryDate < DateOnly.FromDateTime(DateTime.UtcNow))
            throw new MedicineExpiredException(medicine.Name);

        if (medicine.Stock < dto.Quantity)
            throw new OutOfStockException(medicine.Name, medicine.Stock);

        if (await _dispenseRepository.GetByPrescriptionIdAsync(dto.PrescriptionID) is not null)
            throw new DuplicateDispenseException(dto.PrescriptionID);

        var dispense = new Dispense
        {
            DispenseID = IdGenerator.New(),
            MedicineID = dto.MedicineID,
            PrescriptionID = dto.PrescriptionID,
            PharmacistID = GetUserIdFromToken(),
            Quantity = dto.Quantity,
            Status = DispenseStatus.Dispensed,
            Date = DateTime.UtcNow
        };

        await _dispenseRepository.AddAsync(dispense);

        medicine.Stock -= dto.Quantity;
        if (medicine.Stock == 0) medicine.Status = MedicineStatus.OutOfStock;
        await _medicineRepository.UpdateAsync(medicine);

        // Drop the prescription off the pharmacist's "Issued" queue.
        // Skipped silently if the dispense isn't linked to a real prescription row.
        var prescription = await _prescriptionRepository.GetByIdAsync(dto.PrescriptionID);
        if (prescription is not null && prescription.Status == PrescriptionStatus.Issued)
        {
            prescription.Status = PrescriptionStatus.Dispensed;
            await _prescriptionRepository.UpdateAsync(prescription);
        }

        dispense.Medicine = medicine;
        return dispense.ToResponseDto();
    }

    // All Issued prescriptions for the pharmacist's dispense dropdown.
    // Joins to User to attach the patient's display name to each row.
    public async Task<IEnumerable<IssuedPrescriptionResponseDto>> GetIssuedPrescriptionsAsync()
    {
        var prescriptions = (await _prescriptionRepository.GetIssuedAsync()).ToList();
        if (prescriptions.Count == 0) return Enumerable.Empty<IssuedPrescriptionResponseDto>();

        var patientIds = prescriptions
            .Where(p => p.EMR is not null)
            .Select(p => p.EMR.PatientID)
            .Distinct()
            .ToList();

        var nameByUserId = new Dictionary<string, string>();
        foreach (var id in patientIds)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user is not null) nameByUserId[id] = user.UserName;
        }

        return prescriptions.Select(p => new IssuedPrescriptionResponseDto
        {
            PrescriptionID = p.PrescriptionID,
            EMRID = p.EMRID,
            PatientID = p.EMR?.PatientID ?? string.Empty,
            PatientName = p.EMR is not null && nameByUserId.TryGetValue(p.EMR.PatientID, out var name) ? name : string.Empty,
            DoctorID = p.DoctorID,
            Medicine = p.Medicine,
            Dosage = p.Dosage,
            Frequency = p.Frequency,
            Duration = p.Duration,
            CreatedAt = p.CreatedAt
        }).ToList();
    }

    public async Task<IEnumerable<DispenseResponseDto>> GetAllDispensesAsync()
        => (await _dispenseRepository.GetAllAsync()).ToResponseDtoList();

    public async Task<DispenseResponseDto> GetDispenseByIdAsync(string dispenseId)
    {
        var d = await _dispenseRepository.GetByIdAsync(dispenseId) ?? throw new DispenseNotFoundException(dispenseId);
        return d.ToResponseDto();
    }

    public async Task<DispenseResponseDto> GetDispenseByPrescriptionAsync(string prescriptionId)
    {
        var d = await _dispenseRepository.GetByPrescriptionIdAsync(prescriptionId)
            ?? throw new PharmacyServiceException(ErrorMessages.NoDispenseForPrescription(prescriptionId), 404);
        return d.ToResponseDto();
    }
}
