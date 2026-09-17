/**
 * Curated, realistic legal document samples for demonstration and immediate testing.
 * Written with realistic legal terminology and clause structure.
 */

export interface SampleDoc {
  id: string;
  name: string;
  type: string;
  description: string;
  content: string;
}

export const SAMPLE_DOCUMENTS: SampleDoc[] = [
  {
    id: 'sample-saas-msa',
    name: 'CloudScale_Enterprise_SaaS_Agreement_2025.txt',
    type: 'Software as a Service (SaaS) Agreement',
    description: 'Enterprise Cloud Subscription Agreement featuring vendor-favorable liability caps, auto-renewal, and IP assignments.',
    content: `MASTER SOFTWARE AS A SERVICE AGREEMENT

This Master Software as a Service Agreement ("Agreement") is entered into as of January 15, 2025 ("Effective Date"), by and between CloudScale Technologies Inc., a Delaware corporation with its principal place of business at 100 Innovation Way, Suite 400, San Francisco, CA 94105 ("Vendor" or "Provider"), and Apex Global Enterprises LLC, a Delaware limited liability company ("Customer" or "Subscriber").

RECITALS
WHEREAS, Provider has developed and operates a proprietary cloud-based analytics platform known as CloudScale Intelligence; and
WHEREAS, Customer desires to obtain access to and use of the Service for its internal business operations, subject to the terms and conditions hereof;

NOW, THEREFORE, in consideration of the mutual covenants contained herein, the parties agree as follows:

1. DEFINITIONS
1.1 "Authorized Users" means Customer's employees, consultants, and contractors authorized by Customer to access the Services under Customer's account credentials.
1.2 "Customer Data" means all electronic data, files, or information submitted by Customer or Authorized Users to the Services.
1.3 "Service Availability" means the target 99.5% uptime during each calendar month, excluding scheduled maintenance windows notified at least 48 hours in advance.

2. LICENSE GRANT AND RESTRICTIONS
2.1 Subscription Grant. Subject to payment of applicable Fees, Provider grants Customer a non-exclusive, non-transferable, non-sublicensable right to access and use the SaaS Service during the Subscription Term.
2.2 Restrictions. Customer shall not: (a) reverse engineer, decompile, or disassemble any component of the Service; (b) license, sell, rent, or lease access to any third party; (c) use the Service to store or transmit infringing, libelous, or unlawful material; or (d) interfere with or disrupt the integrity or security of the platform.
2.3 Unilateral Modification. Provider reserves the right to modify the features, functionality, and user interface of the Service at any time upon thirty (30) days written notice via platform notification or email.

3. FEES, PAYMENT TERMS, AND TAXES
3.1 Subscription Fees. Customer shall pay an annual fee of $48,000 payable annually in advance within thirty (30) days of invoice date.
3.2 Late Charges. Overdue amounts shall accrue interest at the rate of 1.5% per month or the maximum rate permitted by law, whichever is lower, plus collection costs and reasonable attorneys' fees.
3.3 Price Adjustments. Provider reserves the right to increase annual subscription fees by up to 10% upon each renewal term without requiring an amendment to this Agreement.

4. TERM, AUTO-RENEWAL, AND TERMINATION
4.1 Term. The initial term of this Agreement shall be twelve (12) months starting on the Effective Date.
4.2 Automatic Renewal. This Agreement will automatically renew for successive twelve (12) month periods unless either party delivers written notice of non-renewal at least sixty (60) days prior to the expiration of the then-current term.
4.3 Termination for Cause. Either party may terminate this Agreement upon thirty (30) days prior written notice if the other party materially breaches any provision and fails to cure such breach within said 30-day period.
4.4 Termination for Convenience by Provider. Provider may terminate this Agreement for convenience at any time upon sixty (60) days written notice to Customer, in which event Provider shall refund a pro-rata portion of prepaid unused fees. Customer holds no reciprocal right of termination for convenience.

5. INTELLECTUAL PROPERTY & DATA RIGHTS
5.1 Proprietary Rights. Provider retains all rights, title, and interest, including all Intellectual Property Rights, in and to the Service, documentation, software code, and underlying machine learning models.
5.2 Customer Data Ownership. Customer owns all right, title, and interest in and to Customer Data. Customer hereby grants Provider a worldwide, royalty-free license to host, copy, process, and display Customer Data solely as necessary to provide the Services.
5.3 De-identified Aggregate Data. Notwithstanding Section 5.2, Customer agrees that Provider may aggregate, de-identify, and anonymize Customer Data to train artificial intelligence algorithms, benchmark operational metrics, and publish industry trends, provided that no individual Customer or user is personally identifiable.

6. CONFIDENTIALITY
6.1 Definition. "Confidential Information" means all non-public information disclosed by one party ("Disclosing Party") to the other ("Receiving Party"), whether orally or in writing, that is designated as confidential or reasonably should be understood to be confidential.
6.2 Protection. The Receiving Party shall protect Disclosing Party's Confidential Information with the same degree of care it uses for its own confidential information (but not less than reasonable care), and shall not disclose it to third parties without prior written consent, except to employees needing to know such information.
6.3 Exclusions. Confidential Information does not include information that: (a) becomes publicly known without breach; (b) was already known to Receiving Party prior to disclosure; or (c) is independently developed without reference to Disclosing Party's information.
6.4 Survival. Confidentiality obligations under this Section 6 shall survive termination of this Agreement for a period of five (5) years, except that trade secrets shall remain confidential in perpetuity.

7. WARRANTIES AND DISCLAIMERS
7.1 Limited Warranty. Provider warrants that the Service will perform substantially in accordance with published documentation under normal use. Customer's sole and exclusive remedy for breach of this warranty shall be for Provider to make commercially reasonable efforts to correct the non-conformity.
7.2 Disclaimer. EXCEPT AS EXPRESSLY PROVIDED HEREIN, THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE." PROVIDER DISCLAIMS ALL OTHER WARRANTIES, EXPRESS, IMPLIED, STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

8. INDEMNIFICATION
8.1 Provider IP Indemnity. Provider shall defend, indemnify, and hold harmless Customer against any third-party claim alleging that Customer's authorized use of the Services infringes a valid United States patent, copyright, or trademark, provided that Customer promptly notifies Provider in writing and tenders sole defense control.
8.2 Customer Indemnity. Customer shall defend, indemnify, and hold harmless Provider from and against any third-party claims, liabilities, damages, and costs arising out of: (a) Customer Data; (b) Customer's breach of Section 2.2; or (c) violation of applicable privacy laws by Customer's Authorized Users.

9. LIMITATION OF LIABILITY
9.1 Waiver of Consequential Damages. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, NEITHER PARTY SHALL BE LIABLE TO THE OTHER FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS INTERRUPTION, EVEN IF ADVISED OF THE POSSIBILITY THEREOF.
9.2 Liability Cap. PROVIDER'S TOTAL CUMULATIVE AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT, WHETHER IN CONTRACT, TORT (INCLUDING NEGLIGENCE), OR OTHERWISE, SHALL BE LIMITED TO THE ACTUAL FEES PAID BY CUSTOMER TO PROVIDER IN THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO LIABILITY. CUSTOMER ACKNOWLEDGES THIS LIMITATION REPRESENTS A DELIBERATE ALLOCATION OF RISK.

10. GENERAL PROVISIONS
10.1 Governing Law and Forum. This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to conflict of laws principles. The state and federal courts located in San Francisco County, California shall have exclusive jurisdiction.
10.2 Entire Agreement. This Agreement constitutes the complete and exclusive statement of the agreement between the parties with respect to the subject matter hereof, superseding all prior oral or written proposals and communications.
10.3 Severability. If any provision is held unenforceable, that provision will be modified to the minimum extent necessary to make it enforceable, and the remaining provisions will remain in full effect.
10.4 Assignment. Customer may not assign or transfer this Agreement, by operation of law or otherwise, without Provider's prior written consent. Any unauthorized assignment is void.

IN WITNESS WHEREOF, the authorized representatives of the parties have executed this Agreement as of the Effective Date.

CloudScale Technologies Inc.
By: _____________________________
Name: Marcus Vance
Title: Chief Commercial Officer

Apex Global Enterprises LLC
By: _____________________________
Name: Elena Rodriguez
Title: Chief Technology Officer`
  },
  {
    id: 'sample-mutual-nda',
    name: 'Standard_Mutual_Non_Disclosure_Agreement.txt',
    type: 'Mutual Non-Disclosure Agreement (NDA)',
    description: 'Bilateral confidentiality agreement with standard 3-year term, carveouts, and return/destruction requirements.',
    content: `MUTUAL NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is made and entered into as of March 1, 2025 ("Effective Date"), by and between Horizon BioTech Labs, Inc. ("Horizon") and Sterling Therapeutics Partners LLC ("Sterling"). Each may be referred to individually as a "Party" and collectively as the "Parties."

1. PURPOSE
The Parties wish to explore potential collaborative research, technology licensing, and commercial partnership opportunities regarding molecular diagnostic assays (the "Purpose"). In connection with the Purpose, each Party may disclose to the other certain proprietary and confidential information.

2. CONFIDENTIAL INFORMATION
2.1 Scope. "Confidential Information" refers to any non-public business, technical, scientific, chemical, biological, commercial, or financial information disclosed by one Party ("Disclosing Party") to the other ("Receiving Party"), whether in tangible, written, electronic, or oral form.
2.2 Marking. Tangible disclosures shall be marked with "CONFIDENTIAL" or "PROPRIETARY." Oral disclosures shall be identified as confidential at the time of disclosure and summarized in writing within thirty (30) days thereafter.

3. EXCLUSIONS FROM CONFIDENTIALITY
Confidential Information does not include information that:
(a) is or becomes publicly available through no wrongful act or breach by Receiving Party;
(b) was already in Receiving Party's rightful possession without obligation of confidentiality prior to disclosure;
(c) is independently developed by Receiving Party without access to or reliance upon Disclosing Party's Confidential Information, as demonstrated by contemporaneous written records;
(d) is lawfully obtained from an independent third party having no confidentiality obligation to Disclosing Party; or
(e) is required to be disclosed by applicable law, court order, or regulatory agency, provided Receiving Party gives prompt written notice to enable Disclosing Party to seek a protective order.

4. OBLIGATIONS OF RECEIVING PARTY
4.1 Duty of Care. Receiving Party shall maintain Confidential Information in strict confidence, exercising at least the same degree of care it uses to protect its own sensitive data of like nature, but not less than reasonable care.
4.2 Permitted Use. Receiving Party shall use Confidential Information solely and exclusively in furtherance of the Purpose, and for no other commercial or competitive purpose.
4.3 Restricted Access. Receiving Party may disclose Confidential Information only to its officers, directors, employees, and legal or financial advisors who need to know such information for the Purpose and who are bound by written confidentiality obligations at least as restrictive as those herein.
4.4 Non-Circumvention. Receiving Party shall not use any Confidential Information to circumvent Disclosing Party in commercial transactions or patent applications.

5. TERM AND DURATION OF OBLIGATIONS
5.1 Term. This Agreement shall remain in effect for a period of two (2) years from the Effective Date, unless terminated earlier by either Party upon thirty (30) days written notice.
5.2 Duration of Obligations. The confidentiality, non-use, and non-disclosure obligations shall survive for a period of three (3) years following the date of disclosure, except that any information qualifying as a trade secret under applicable law shall remain subject to protection for so long as it remains a trade secret.

6. RETURN OR DESTRUCTION OF MATERIALS
Upon written request by Disclosing Party or upon termination of discussions regarding the Purpose, Receiving Party shall promptly, and within fifteen (15) business days:
(a) return all originals and copies of tangible Confidential Information; or
(b) certify in writing signed by an executive officer that all copies, notes, extracts, and summaries thereof have been securely destroyed, save for automated system disaster recovery backups which cannot be reasonably purged and shall remain subject to the confidentiality terms herein until overwritten.

7. NO LICENSE OR OBLIGATION TO TRANSACT
7.1 No IP Rights Granted. Nothing in this Agreement grants either Party any right, title, license, patent, trademark, or copyright in or to the other Party's intellectual property.
7.2 No Binding Transaction. This Agreement does not obligate either Party to enter into any business transaction, definitive contract, or commercial relationship.

8. REMEDIES AND INJUNCTIVE RELIEF
The Parties acknowledge that any unauthorized disclosure or use of Confidential Information will cause immediate and irreparable harm for which monetary damages alone would be inadequate. Accordingly, Disclosing Party shall be entitled to seek injunctive relief and specific performance in any court of competent jurisdiction without the necessity of posting a bond, in addition to all other remedies available at law.

9. GOVERNING LAW AND DISPUTE RESOLUTION
This Agreement shall be governed by and interpreted under the laws of the State of New York, without regard to its conflict of laws principles. Any legal suit or proceeding arising under this Agreement shall be brought exclusively in the state or federal courts sitting in New York County, New York.

10. MISCELLANEOUS
10.1 Entire Agreement. This Agreement embodies the entire understanding of the Parties concerning the subject matter and supersedes all prior agreements.
10.2 Amendments. No modification or waiver shall be binding unless executed in writing by authorized representatives of both Parties.
10.3 Counterparts. This Agreement may be executed in counterparts, each of which shall be deemed an original, and electronic signatures shall be legally binding.

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first set forth above.

Horizon BioTech Labs, Inc.
By: _______________________________
Dr. Arthur Chen, VP of Partnerships

Sterling Therapeutics Partners LLC
By: _______________________________
Claire Montgomery, Managing Director`
  },
  {
    id: 'sample-commercial-lease',
    name: 'Commercial_Office_Lease_Agreement_Shortened.txt',
    type: 'Commercial Real Estate Lease',
    description: 'Triple-net (NNN) commercial premises lease containing strict repair covenants, landlord right-of-entry, and tenant indemnity.',
    content: `COMMERCIAL LEASE AGREEMENT

THIS LEASE AGREEMENT ("Lease") is made as of February 1, 2025, between Metro Commercial Holdings LLC, a Delaware LLC ("Landlord"), and Luminary Software Inc., a Delaware corporation ("Tenant").

1. PREMISES
Landlord leases to Tenant Suite 500 containing approximately 4,200 rentable square feet on the 5th floor ("Premises") of the building located at 500 Market Street, Austin, TX 78701 ("Building").

2. TERM
2.1 Term. The term of this Lease shall be thirty-six (36) months ("Lease Term"), commencing on April 1, 2025 ("Commencement Date") and expiring on March 31, 2028.
2.2 Holding Over. If Tenant holds over after expiration without Landlord's written consent, Tenant shall pay monthly Base Rent at 200% of the last applicable rate.

3. RENT AND TRIPLE NET CHARGES
3.1 Base Rent. Tenant shall pay Base Rent in monthly installments of $14,000 on or before the first day of each calendar month, without deduction, offset, or prior notice.
3.2 Operating Expenses (NNN). In addition to Base Rent, Tenant shall pay its Proportionate Share (8.4%) of all Building Operating Expenses, Real Estate Taxes, and Building Insurance Premiums.
3.3 Security Deposit. Upon execution, Tenant shall deposit $28,000 as a Security Deposit for faithful performance.

4. REPAIRS AND MAINTENANCE
Tenant shall, at its sole cost, keep the Premises, including interior partitions, fixtures, electrical wiring, HVAC distribution, and plumbing in good order, condition, and repair. Tenant waives all rights under any statute permitting tenants to make repairs at landlord's expense.

5. USE AND ALTERATIONS
Tenant shall use the Premises strictly for general office and administrative purposes. Tenant shall make no structural alterations without Landlord's prior written consent. Any alterations shall immediately become the property of Landlord upon termination.

6. ACCESS AND INSPECTION
Landlord and its agents shall have the right to enter the Premises at all reasonable times, upon twenty-four (24) hours oral notice, or without notice in the event of an emergency, to inspect, exhibit to prospective purchasers or tenants, or perform repairs.

7. INDEMNITY AND INSURANCE
7.1 Indemnification. Tenant shall indemnify, defend, and hold harmless Landlord and its property managers from all claims, losses, or damages arising out of Tenant's use of the Premises or any negligence of Tenant's agents or invitees.
7.2 Commercial General Liability. Tenant shall maintain Commercial General Liability Insurance with minimum limits of $2,000,000 per occurrence and $4,000,000 aggregate, naming Landlord as an additional insured.

8. DEFAULT AND REMEDIES
Tenant shall be in default if: (a) Rent remains unpaid five (5) days after written notice; or (b) Tenant fails to cure non-monetary breach within fifteen (15) days after notice. Upon default, Landlord may terminate this Lease, re-enter and re-let the Premises, and recover all unpaid rent plus the accelerated balance of future rent discounted to present value.

9. GOVERNING LAW
This Lease shall be governed by the laws of the State of Texas. Venue for any dispute shall lie in Travis County, Texas.

METRO COMMERCIAL HOLDINGS LLC (Landlord)
By: _______________________________
David Sterling, Vice President

LUMINARY SOFTWARE INC. (Tenant)
By: _______________________________
Rachel Adams, Chief Executive Officer`
  }
];
