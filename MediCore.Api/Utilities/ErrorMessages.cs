namespace MediCore.Api.Utilities;

// All user-facing error messages thrown from services / returned from controllers /
// written by the global exception middleware. Centralized here so wording stays
// consistent and can be tweaked in one place.
//
// Templated messages (those that interpolate runtime values) are exposed as static
// methods rather than format strings, so callers stay strongly typed.
public static class ErrorMessages
{
    // ─── Auth / Identity ─────────────────────────────
    public const string InvalidEmail = "Invalid Email";
    public const string InvalidPassword = "Password is invalid.";
    public const string InvalidRefreshToken = "No token found.";
    public const string EmailAlreadyExists = "Email already exists.";
    public const string UserNotFound = "User not found.";
    public const string UserIdRequired = "User id is required.";
    public const string FailedToDeleteUser = "Failed to delete user.";
    public const string AdminCannotBeDeleted = "Admin accounts cannot be deleted.";
    public const string OnlyPatientSelfRegister =
        "Only Patient accounts can be self-registered. Contact an administrator to create other role accounts.";
    public const string AdminCannotBeRegistered = "Admin accounts cannot be created via registration.";
    public const string RoleChangeRequiresAdmin = "Only administrators can change a user's role.";
    public const string CannotAssignAdminRole = "The Admin role cannot be assigned.";
    public const string CannotChangeAdminRole = "The role of an Admin user cannot be changed.";

    public static string InvalidRoleOrStatus(string detail) => $"Invalid Role or Status value. {detail}";

    // ─── Patient ─────────────────────────────────────
    public const string PatientNotFound = "Patient not found";
    public const string PatientAlreadyExists = "Patient already exist.";
    public const string PatientDocumentNotFound = "Document not found.";
    public const string PatientProfileDataRequiredOnRegister =
        "Patient profile data is required when registering a Patient.";
    public const string PatientProfileDataRequiredForRole =
        "Patient profile data is required for Patient role.";

    // ─── Appointment ─────────────────────────────────
    public const string SlotNotAvailable = "Selected slot is not available.";
    public const string NewSlotNotAvailable = "New slot is not available.";
    public const string PatientProfileNotFoundForUser = "Patient profile not found for this user.";
    public const string AppointmentEndpointRestricted =
        "This endpoint is only available for Patients, Doctors and Admins.";
    public const string CanOnlyRescheduleOwnAppointments = "You can only reschedule your own appointments.";
    public const string CanOnlyCancelOwnAppointments = "You can only cancel your own appointments.";
    public const string CanOnlyCompleteOwnAppointments = "You can only complete your own appointments.";
    public const string CannotBookPastSlot = "You cannot book an appointment for a past date or time.";
    public const string CannotRescheduleToPastSlot = "You cannot reschedule to a past date or time.";
    public const string CannotCreateScheduleInPast = "You cannot create a schedule for a past date or time.";

    // ─── Billing ─────────────────────────────────────
    public const string BillAmountMustBePositive = "Bill amount must be greater than zero.";
    public const string PaymentAmountMustBePositive = "Payment amount must be greater than zero.";
    public const string CannotClaimFullyPaidBill = "Cannot submit claim for a fully paid bill.";

    public static string ClaimAmountOutOfRange(decimal billAmount)
        => $"Claim amount must be between 1 and {billAmount:C}.";

    // ─── EMR ─────────────────────────────────────────
    public const string CannotAddPrescriptionToClosedOrArchivedEmr =
        "Cannot add prescription to a closed or archived EMR.";

    // ─── Lab ─────────────────────────────────────────
    public const string CannotAssignTechnicianToCancelledTest =
        "Cannot assign technician to a cancelled test.";
    public const string CannotUpdateCancelledTestStatus = "Cannot update status of a cancelled test.";
    public const string ReportOnlyForCompletedTest = "Report can only be uploaded for a completed test.";

    // ─── Pharmacy ────────────────────────────────────
    public const string StockQuantityMustBePositive = "Stock quantity must be greater than zero.";
    public const string MedicineMustBeInactiveToHardDelete =
        "Medicine must first be removed (set to Inactive) before it can be permanently deleted.";
    public const string MedicineHasDispenseHistory =
        "Cannot permanently delete a medicine that has dispense records. The Inactive status preserves the audit trail.";
    public const string CannotReactivateExpiredMedicine =
        "Cannot reactivate a medicine whose expiry date has passed.";

    public static string MedicineInactive(string name) => $"{name} is inactive and cannot be dispensed.";
    public static string NoDispenseForPrescription(string prescriptionId)
        => $"No dispense record found for prescription {prescriptionId}.";

    // ─── Middleware fallback ─────────────────────────
    public const string UnexpectedError = "An unexpected error occurred.";
}
