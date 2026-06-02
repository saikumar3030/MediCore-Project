namespace MediCore.Domain.Exceptions;

public class BillingServiceException : MediCoreException
{
    public BillingServiceException(string message, int statusCode = 400) : base(message, statusCode) { }
}

public class BillNotFoundException : BillingServiceException
{
    public BillNotFoundException(string id) : base($"Bill {id} not found.", 404) { }
}

public class BillAlreadyPaidException : BillingServiceException
{
    public BillAlreadyPaidException(string billId) : base($"Bill {billId} is already fully paid.", 400) { }
}

public class BillCancelledException : BillingServiceException
{
    public BillCancelledException(string billId) : base($"Bill {billId} is cancelled.", 400) { }
}

public class ClaimNotFoundException : BillingServiceException
{
    public ClaimNotFoundException(string id) : base($"Insurance claim {id} not found.", 404) { }
}

public class DuplicateClaimException : BillingServiceException
{
    public DuplicateClaimException(string billId)
        : base($"An active insurance claim already exists for bill {billId}.", 409) { }
}

public class OverpaymentException : BillingServiceException
{
    public OverpaymentException(decimal remaining)
        : base($"Payment exceeds remaining bill amount. Remaining: {remaining:C}.", 400) { }
}

public class PaymentNotFoundException : BillingServiceException
{
    public PaymentNotFoundException(string id) : base($"Payment {id} not found.", 404) { }
}
