using MediCore.Domain.Enums;

namespace MediCore.Api.DTOs;

public class AddMedicineRequestDto
{
    public string Name { get; set; } = string.Empty;
    public MedicineType Type { get; set; }
    public int Stock { get; set; }
    public DateOnly ExpiryDate { get; set; }
}

public class UpdateStockRequestDto
{
    public int Quantity { get; set; }
}

public class UpdateMedicineStatusRequestDto
{
    public MedicineStatus Status { get; set; }
}

public class MedicineResponseDto
{
    public string MedicineID { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Stock { get; set; }
    public DateOnly ExpiryDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class DispenseMedicineRequestDto
{
    public string MedicineID { get; set; } = string.Empty;
    public string PrescriptionID { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

public class IssuedPrescriptionResponseDto
{
    public string PrescriptionID { get; set; } = string.Empty;
    public string EMRID { get; set; } = string.Empty;
    public string PatientID { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string DoctorID { get; set; } = string.Empty;
    public string Medicine { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class DispenseResponseDto
{
    public string DispenseID { get; set; } = string.Empty;
    public string MedicineID { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string PrescriptionID { get; set; } = string.Empty;
    public string PharmacistID { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime Date { get; set; }
}
