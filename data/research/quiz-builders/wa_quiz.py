from quizgen import build
import re
co = open('co_quiz.py').read()
def shared(slug):
    m = re.search(r'slug="' + slug + r'", name="(.*?)", level="(.*?)",\s*statement="(.*?)",\s*help="(.*?)",', co, re.S)
    return dict(slug=slug, name=m.group(1), level=m.group(2), statement=m.group(3), help=m.group(4))
PAMPH = "https://www.sos.wa.gov/sites/default/files/2026-10/Voters%20Pamphlet%202026%20-%20Edition%2006%20-%20King%20-%20South%20and%20Southeast.pdf"
S = {"house": (PAMPH, "Washington State Voters' Pamphlet 2026 (candidate statement)", "wa-house.txt"),
     "ld37": (PAMPH, "Washington State Voters' Pamphlet 2026 (candidate statement)", "wa-ld37.txt")}
J, SH, AS, DB, CS = "wa26-pramila-jayapal", "wa26-nirav-sheth", "wa26-adam-smith", "wa26-doug-basler", "wa26-chipalo-street"
axes = [
  dict(shared("us-limit-ice-tactics"), stances=[
    (J, 2, "Says she has been holding the administration accountable for \"lawless ICE and CBP actions.\"", "house",
     "I’ve been on the frontlines of holding Trump accountable, including around the lawless ICE and CBP actions that have kidnapped and disappeared our neighbors."),
  ]),
  dict(slug="us-medicare-for-all", name="Medicare for All", level="federal",
       statement="The U.S. should move to a single-payer health system like Medicare for All.",
       help="Single-payer would replace most private insurance with one public plan. Supporters say it guarantees coverage and cuts administrative costs; opponents cite tax increases and loss of private plans.",
       stances=[
         (J, 2, "Is leading the fight for the Medicare for All Act.", "house",
          "I’m leading the fight for the Medicare for All Act to ensure that universal healthcare is a right, not a privilege."),
         (AS, 1, "Says the health system should be restructured to create a path to single-payer like Medicare for All.", "house",
          "Our healthcare system needs to be restructured to create a path to a single-payer plan like Medicare for All."),
       ]),
  dict(slug="us-ultra-millionaire-wealth-tax", name="Wealth tax", level="federal",
       statement="Congress should tax the wealth of ultra-millionaires.",
       help="A wealth tax would apply to a person's total assets above a high threshold, not just income. Supporters say it addresses inequality; opponents say it's hard to enforce and may be unconstitutional.",
       stances=[
         (J, 2, "Leads legislation to establish an ultra-millionaire wealth tax.", "house",
          "I also lead landmark legislation to make higher education tuitionfree, guarantee housing as a human right, expand workers’ rights, raise the federal minimum wage, implement humane immigration reform, and establish an ultra-millionaire wealth tax."),
       ]),
  dict(shared("congress-stock-trading-ban"), stances=[
    (J, 2, "Leads bipartisan bills to ban stock trading by members of Congress.", "house",
     "I lead bipartisan bills that ban stock trading for Members of Congress and protect Americans from government spying."),
  ]),
  dict(slug="wa-climate-commitment-act", name="Climate Commitment Act", level="state",
       statement="Washington's carbon-pricing law, the Climate Commitment Act, is worth what it costs.",
       help="The Climate Commitment Act makes large emitters buy allowances for carbon pollution and funds climate projects. Supporters say it cuts emissions; critics say it raises gas and energy prices.",
       stances=[
         (DB, -2, "Says the Climate Commitment Act is driving up energy costs while doing little for the environment.", "house",
          "The Climate Commitment Act may sound good, but in practice it is driving up the cost of energy while doing little to directly improve the environment."),
       ]),
  dict(slug="wa-keep-millionaires-tax", name="Tax on income over $1 million", level="state",
       statement="Washington should keep its 9.9% tax on income over $1 million.",
       help="Initiative IP26-645 on this ballot would repeal the tax and ban taxes on individual income. Supporters of the tax say it funds schools and health care; opponents say it opens the door to a broad income tax.",
       stances=[
         (CS, 2, "Championed the millionaires tax in the Legislature.", "ld37",
          "I earned positions in Democratic leadership and on tax and budget committees to champion the millionaires tax, which funds education, expands healthcare access, and cuts taxes for working families."),
       ]),
  dict(slug="wa-rent-stabilization", name="Rent stabilization", level="state",
       statement="Washington should limit how much landlords can raise rent each year.",
       help="Washington passed a rent-stabilization law capping annual increases. Supporters say it prevents displacement; opponents say it discourages building and maintaining rentals.",
       stances=[
         (CS, 2, "Fought to pass tenant protections including rent stabilization.", "ld37",
          "I battled the landlord lobby to pass tenant protections like rent stabilization and reformed zoning laws to increase home building."),
       ]),
]
build("wa-general-2026-11-03", "Washington 2026 General Election Quiz", axes, S)
