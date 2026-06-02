using MediCore.Api.DTOs;

namespace MediCore.Api.Services;

public interface IPharmacyService
{
    Task<MedicineResponseDto> AddMedicineAsync(AddMedicineRequestDto dto);
    Task<IEnumerable<MedicineResponseDto>> GetAllMedicinesAsync();
    Task<MedicineResponseDto> GetMedicineByIdAsync(string medicineId);
    Task<MedicineResponseDto> UpdateStockAsync(string medicineId, UpdateStockRequestDto dto);
    Task<MedicineResponseDto> UpdateMedicineStatusAsync(string medicineId, UpdateMedicineStatusRequestDto dto);
    Task<MedicineResponseDto> ReactivateMedicineAsync(string medicineId);
    Task<MedicineResponseDto> RemoveMedicineAsync(string medicineId);
    Task HardDeleteMedicineAsync(string medicineId);
    Task<DispenseResponseDto> DispenseMedicineAsync(DispenseMedicineRequestDto dto);
    Task<IEnumerable<DispenseResponseDto>> GetAllDispensesAsync();
    Task<DispenseResponseDto> GetDispenseByIdAsync(string dispenseId);
    Task<DispenseResponseDto> GetDispenseByPrescriptionAsync(string prescriptionId);
    Task<IEnumerable<IssuedPrescriptionResponseDto>> GetIssuedPrescriptionsAsync();
}
