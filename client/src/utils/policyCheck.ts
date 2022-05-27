export function getPolicyDateString(): string {
  return '2022-05-27';
}

export function setReviewedPolicyDate() {
  localStorage.setItem('reviewedPolicyDate', getPolicyDateString())
}

export function hasReviewedPolicy (): boolean {
  const reviewedPolicyDate = localStorage.getItem('reviewedPolicyDate')
  if (reviewedPolicyDate === null) {
    return false
  }
  return reviewedPolicyDate === getPolicyDateString()
}
