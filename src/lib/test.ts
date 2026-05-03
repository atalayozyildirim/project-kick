export function sifreligiris(sifre: string) {
  console.log(process.env.KICK_ACSESS);

  if (sifre === process.env.KICK_ACSESS) {
    console.log(process.env.KICK_ACSESS);
    return true;
  }
  return false;
}
