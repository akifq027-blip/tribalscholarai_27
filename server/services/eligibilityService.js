/**
 * Eligibility Engine for TribalScholar AI
 * Deterministic, rule-based verification ensuring real merit & statutory compliance
 * without non-deterministic AI halluncinations.
 */

export function checkEligibility(studentProfile, scholarship) {
  if (!studentProfile) {
    return {
      eligible: false,
      matchPercentage: 0,
      criteria: [
        {
          name: 'Student Profile',
          passed: false,
          detail: 'Profile details not completed yet. Please fill in your student profile.',
        },
      ],
      summary: 'Please complete your student profile to evaluate eligibility.',
    };
  }

  const criteria = [];
  let score = 0;
  let totalWeight = 0;

  // 1. Scheduled Tribe (ST) Category Verification (Weight: 30)
  totalWeight += 30;
  const isST =
    studentProfile.category &&
    (studentProfile.category.toLowerCase().includes('tribe') ||
      studentProfile.category.toLowerCase().includes('st'));
  const schemeRequiresST =
    !scholarship.eligible_categories ||
    scholarship.eligible_categories.toLowerCase().includes('st') ||
    scholarship.eligible_categories.toLowerCase().includes('tribe') ||
    scholarship.eligible_categories.toLowerCase().includes('all');

  if (isST && schemeRequiresST) {
    score += 30;
    criteria.push({
      name: 'Category Requirement',
      passed: true,
      detail: `Student belongs to ${studentProfile.category} (Requirement satisfied).`,
    });
  } else if (!isST && schemeRequiresST) {
    criteria.push({
      name: 'Category Requirement',
      passed: false,
      detail: `Scheme requires Scheduled Tribe (ST) status. Current profile category is "${studentProfile.category || 'Not specified'}".`,
    });
  } else {
    score += 30;
    criteria.push({
      name: 'Category Requirement',
      passed: true,
      detail: 'Open to all categories or verified ST category.',
    });
  }

  // 2. Annual Family Income Ceiling (Weight: 25)
  totalWeight += 25;
  const studentIncome = Number(studentProfile.annual_family_income || 0);
  const maxIncome = Number(scholarship.maximum_income || 9999999);

  if (studentProfile.annual_family_income !== null && studentProfile.annual_family_income !== undefined) {
    if (studentIncome <= maxIncome) {
      score += 25;
      criteria.push({
        name: 'Family Income Ceiling',
        passed: true,
        detail: `Annual family income ₹${studentIncome.toLocaleString('en-IN')} is within ceiling of ₹${maxIncome.toLocaleString('en-IN')}.`,
      });
    } else {
      criteria.push({
        name: 'Family Income Ceiling',
        passed: false,
        detail: `Annual family income ₹${studentIncome.toLocaleString('en-IN')} exceeds scheme maximum ceiling of ₹${maxIncome.toLocaleString('en-IN')}.`,
      });
    }
  } else {
    criteria.push({
      name: 'Family Income Ceiling',
      passed: false,
      detail: `Income not specified in profile. Maximum allowed ceiling is ₹${maxIncome.toLocaleString('en-IN')}.`,
    });
  }

  // 3. Academic Merit / Minimum Percentage (Weight: 20)
  totalWeight += 20;
  const minPercentage = Number(scholarship.minimum_percentage || 0);
  const studentPercentage = Number(studentProfile.percentage || (studentProfile.cgpa ? studentProfile.cgpa * 9.5 : 0));

  if (studentPercentage >= minPercentage) {
    score += 20;
    criteria.push({
      name: 'Academic Percentage',
      passed: true,
      detail: `Academic score ${studentPercentage.toFixed(1)}% satisfies minimum threshold of ${minPercentage.toFixed(1)}%.`,
    });
  } else {
    criteria.push({
      name: 'Academic Percentage',
      passed: false,
      detail: `Current academic score ${studentPercentage.toFixed(1)}% is below required ${minPercentage.toFixed(1)}%.`,
    });
  }

  // 4. Education Level & Course Matching (Weight: 15)
  totalWeight += 15;
  const schemeEdu = (scholarship.education_level || 'Any').toLowerCase();
  const studentEdu = (studentProfile.education_level || '').toLowerCase();

  const isEduMatch =
    schemeEdu === 'any' ||
    studentEdu.includes(schemeEdu) ||
    schemeEdu.includes(studentEdu) ||
    (schemeEdu.includes('undergraduate') && (studentEdu.includes('b.tech') || studentEdu.includes('degree') || studentEdu.includes('undergraduate')));

  if (isEduMatch) {
    score += 15;
    criteria.push({
      name: 'Education Level',
      passed: true,
      detail: `Enrolled in ${studentProfile.education_level || 'Higher Education'} (${scholarship.course || 'Approved Courses'}).`,
    });
  } else {
    criteria.push({
      name: 'Education Level',
      passed: false,
      detail: `Scheme is designated for "${scholarship.education_level}", current level is "${studentProfile.education_level || 'Not specified'}".`,
    });
  }

  // 5. State / Domicile Criterion (Weight: 10)
  totalWeight += 10;
  const eligibleStates = (scholarship.eligible_states || 'All States').toLowerCase();
  const studentState = (studentProfile.state || studentProfile.domicile || '').toLowerCase();

  if (eligibleStates.includes('all') || eligibleStates.includes(studentState)) {
    score += 10;
    criteria.push({
      name: 'State / Domicile',
      passed: true,
      detail: `Applicable nationwide or verified state domicile (${studentProfile.state || 'India'}).`,
    });
  } else {
    criteria.push({
      name: 'State / Domicile',
      passed: false,
      detail: `Restricted to ${scholarship.eligible_states}; student domicile is ${studentProfile.state || 'Other'}.`,
    });
  }

  const matchPercentage = Math.round((score / totalWeight) * 100);
  const eligible = criteria.every((c) => c.passed);

  let label = 'Not Eligible';
  if (matchPercentage >= 90 && eligible) {
    label = 'Eligible';
  } else if (matchPercentage >= 65) {
    label = 'Almost Eligible';
  }

  return {
    eligible,
    matchPercentage,
    label,
    criteria,
    summary: eligible
      ? `You meet all ${criteria.length} statutory requirements for this scheme with a ${matchPercentage}% profile match!`
      : `Your profile matches ${matchPercentage}% of the scheme requirements. Review the criteria list for missing conditions.`,
  };
}

export default {
  checkEligibility,
};
