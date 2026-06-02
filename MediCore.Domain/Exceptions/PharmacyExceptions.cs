namespace MediCore.Domain.Exceptions;

public class PharmacyServiceException : MediCoreException
{
    public PharmacyServiceException(string message, int statusCode = 400) : base(message, statusCode) { }
}

public class MedicineNotFoundException : PharmacyServiceException
{
    public MedicineNotFoundException(string id) : base($"Medicine {id} not found.", 404) { }
}

public class MedicineExpiredException : PharmacyServiceException
{
    public MedicineExpiredException(string name)
        : base($"{name} is expired and cannot be dispensed.", 400) { }
}

public class OutOfStockException : PharmacyServiceException
{
    public OutOfStockException(string name, int available)
        : base($"Insufficient stock for {name}. Available: {available}.", 400) { }
}

public class DispenseNotFoundException : PharmacyServiceException
{
    public DispenseNotFoundException(string id) : base($"Dispense record {id} not found.", 404) { }
}

public class DuplicateDispenseException : PharmacyServiceException
{
    public DuplicateDispenseException(string prescriptionId)
        : base($"Prescription {prescriptionId} has already been dispensed.", 409) { }
}

public class UnauthorizedPharmacyAccessException : PharmacyServiceException
{
    public UnauthorizedPharmacyAccessException()
        : base("You are not authorized to perform this action.", 403) { }
}
