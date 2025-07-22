import { relations } from "drizzle-orm/relations";
import { pdfForms, pdfFormFields, feeGroups, feeItemGroups, pricingTypes, campaigns, feeItems, emailTemplates, emailTriggers, campaignAssignments, merchantProspects, users, campaignEquipment, equipmentItems, campaignFeeValues, pricingTypeFeeItems, pdfFormSubmissions, businessOwnership, agents, emailActivity, auditLogs, dataAccessLogs, securityEvents, twoFactorCodes, merchants, locations, addresses } from "./schema";

export const pdfFormFieldsRelations = relations(pdfFormFields, ({one}) => ({
	pdfForm: one(pdfForms, {
		fields: [pdfFormFields.formId],
		references: [pdfForms.id]
	}),
}));

export const pdfFormsRelations = relations(pdfForms, ({many}) => ({
	pdfFormFields: many(pdfFormFields),
	pdfFormSubmissions: many(pdfFormSubmissions),
}));

export const feeItemGroupsRelations = relations(feeItemGroups, ({one, many}) => ({
	feeGroup: one(feeGroups, {
		fields: [feeItemGroups.feeGroupId],
		references: [feeGroups.id]
	}),
	feeItems: many(feeItems),
}));

export const feeGroupsRelations = relations(feeGroups, ({many}) => ({
	feeItemGroups: many(feeItemGroups),
	feeItems: many(feeItems),
}));

export const campaignsRelations = relations(campaigns, ({one, many}) => ({
	pricingType: one(pricingTypes, {
		fields: [campaigns.pricingTypeId],
		references: [pricingTypes.id]
	}),
	campaignAssignments: many(campaignAssignments),
	campaignEquipments: many(campaignEquipment),
	campaignFeeValues: many(campaignFeeValues),
}));

export const pricingTypesRelations = relations(pricingTypes, ({many}) => ({
	campaigns: many(campaigns),
	pricingTypeFeeItems: many(pricingTypeFeeItems),
}));

export const feeItemsRelations = relations(feeItems, ({one, many}) => ({
	feeGroup: one(feeGroups, {
		fields: [feeItems.feeGroupId],
		references: [feeGroups.id]
	}),
	feeItemGroup: one(feeItemGroups, {
		fields: [feeItems.feeItemGroupId],
		references: [feeItemGroups.id]
	}),
	campaignFeeValues: many(campaignFeeValues),
	pricingTypeFeeItems: many(pricingTypeFeeItems),
}));

export const emailTriggersRelations = relations(emailTriggers, ({one}) => ({
	emailTemplate: one(emailTemplates, {
		fields: [emailTriggers.templateId],
		references: [emailTemplates.id]
	}),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({many}) => ({
	emailTriggers: many(emailTriggers),
	emailActivities: many(emailActivity),
}));

export const campaignAssignmentsRelations = relations(campaignAssignments, ({one}) => ({
	campaign: one(campaigns, {
		fields: [campaignAssignments.campaignId],
		references: [campaigns.id]
	}),
	merchantProspect: one(merchantProspects, {
		fields: [campaignAssignments.prospectId],
		references: [merchantProspects.id]
	}),
	user: one(users, {
		fields: [campaignAssignments.assignedBy],
		references: [users.id]
	}),
}));

export const merchantProspectsRelations = relations(merchantProspects, ({one, many}) => ({
	campaignAssignments: many(campaignAssignments),
	businessOwnerships: many(businessOwnership),
	agent: one(agents, {
		fields: [merchantProspects.agentId],
		references: [agents.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	campaignAssignments: many(campaignAssignments),
	twoFactorCodes: many(twoFactorCodes),
}));

export const campaignEquipmentRelations = relations(campaignEquipment, ({one}) => ({
	campaign: one(campaigns, {
		fields: [campaignEquipment.campaignId],
		references: [campaigns.id]
	}),
	equipmentItem: one(equipmentItems, {
		fields: [campaignEquipment.equipmentItemId],
		references: [equipmentItems.id]
	}),
}));

export const equipmentItemsRelations = relations(equipmentItems, ({many}) => ({
	campaignEquipments: many(campaignEquipment),
}));

export const campaignFeeValuesRelations = relations(campaignFeeValues, ({one}) => ({
	campaign: one(campaigns, {
		fields: [campaignFeeValues.campaignId],
		references: [campaigns.id]
	}),
	feeItem: one(feeItems, {
		fields: [campaignFeeValues.feeItemId],
		references: [feeItems.id]
	}),
}));

export const pricingTypeFeeItemsRelations = relations(pricingTypeFeeItems, ({one}) => ({
	pricingType: one(pricingTypes, {
		fields: [pricingTypeFeeItems.pricingTypeId],
		references: [pricingTypes.id]
	}),
	feeItem: one(feeItems, {
		fields: [pricingTypeFeeItems.feeItemId],
		references: [feeItems.id]
	}),
}));

export const businessOwnershipRelations = relations(businessOwnership, ({one}) => ({
	pdfFormSubmission: one(pdfFormSubmissions, {
		fields: [businessOwnership.formSubmissionId],
		references: [pdfFormSubmissions.id]
	}),
	merchantProspect: one(merchantProspects, {
		fields: [businessOwnership.prospectId],
		references: [merchantProspects.id]
	}),
}));

export const pdfFormSubmissionsRelations = relations(pdfFormSubmissions, ({one, many}) => ({
	businessOwnerships: many(businessOwnership),
	pdfForm: one(pdfForms, {
		fields: [pdfFormSubmissions.formId],
		references: [pdfForms.id]
	}),
}));

export const agentsRelations = relations(agents, ({many}) => ({
	merchantProspects: many(merchantProspects),
}));

export const emailActivityRelations = relations(emailActivity, ({one}) => ({
	emailTemplate: one(emailTemplates, {
		fields: [emailActivity.templateId],
		references: [emailTemplates.id]
	}),
}));

export const dataAccessLogsRelations = relations(dataAccessLogs, ({one}) => ({
	auditLog: one(auditLogs, {
		fields: [dataAccessLogs.auditLogId],
		references: [auditLogs.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({many}) => ({
	dataAccessLogs: many(dataAccessLogs),
	securityEvents: many(securityEvents),
}));

export const securityEventsRelations = relations(securityEvents, ({one}) => ({
	auditLog: one(auditLogs, {
		fields: [securityEvents.auditLogId],
		references: [auditLogs.id]
	}),
}));

export const twoFactorCodesRelations = relations(twoFactorCodes, ({one}) => ({
	user: one(users, {
		fields: [twoFactorCodes.userId],
		references: [users.id]
	}),
}));

export const locationsRelations = relations(locations, ({one, many}) => ({
	merchant: one(merchants, {
		fields: [locations.merchantId],
		references: [merchants.id]
	}),
	addresses: many(addresses),
}));

export const merchantsRelations = relations(merchants, ({many}) => ({
	locations: many(locations),
}));

export const addressesRelations = relations(addresses, ({one}) => ({
	location: one(locations, {
		fields: [addresses.locationId],
		references: [locations.id]
	}),
}));