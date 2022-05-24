export function getPolicyDateString(): string {
  return '2022-05-25';
}

export function getPolicyDate(): Date {
  return new Date(getPolicyDateString())
}

export function setReviewedPolicyDate(time: Date) {
  localStorage.setItem('reviewedPolicyDateTime', time.getTime().toString())
}

export function hasReviewedPolicy (): boolean {
  const reviewedPolicyDateTime = localStorage.getItem('reviewedPolicyDateTime')
  if (reviewedPolicyDateTime === null) {
    return false
  }
  const reviewedPolicyDate = new Date(parseInt(reviewedPolicyDateTime))
  return reviewedPolicyDate > getPolicyDate()
}
