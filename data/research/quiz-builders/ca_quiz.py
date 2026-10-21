from quizgen import build
GOV = ("https://calmatters.org/california-voter-guide-2026/governor/", "CalMatters 2026 Voter Guide: Governor", "calm-gov.txt")
INS = ("https://calmatters.org/california-voter-guide-2026/insurance-commissioner/", "CalMatters 2026 Voter Guide: Insurance Commissioner", "calm-insurance-commissioner.txt")
AG = ("https://calmatters.org/california-voter-guide-2026/attorney-general/", "CalMatters 2026 Voter Guide: Attorney General", "calm-attorney-general.txt")
SOS = ("https://calmatters.org/california-voter-guide-2026/secretary-of-state/", "CalMatters 2026 Voter Guide: Secretary of State", "calm-secretary-of-state.txt")
SPI = ("https://calmatters.org/california-voter-guide-2026/superintendent-of-public-instruction/", "CalMatters 2026 Voter Guide: Superintendent", "calm-superintendent-of-public-instruction.txt")
S = {"gov": GOV, "ins": INS, "ag": AG, "sos": SOS, "spi": SPI}
B, H = "ca26-xavier-becerra", "ca26-steve-hilton"
axes = [
  dict(slug="ca-top-earner-income-tax", name="Income taxes on top earners", level="state",
       statement="California should keep higher income tax rates on top earners to help fund schools.",
       help="Prop 3 on this ballot would extend the existing tax on high incomes to fund schools and health care. Supporters say it funds schools and health care; opponents say California's taxes are already among the highest and push people and businesses out.",
       stances=[
         (B, 2, "Supports a progressive income tax and extending the higher tax rate on high earners to pay for schools.", "gov",
          "Becerra supports a progressive income tax system and the proposal to extend a higher tax rate on high earners to pay for schools."),
         (H, -2, "Would eliminate state income tax on the first $150,000 of earnings and make the income tax a flat rate above that.", "gov",
          "Hilton wants to eliminate state income tax on the first $150,000 of Californians’ earnings, and make the income tax a flat rate above that."),
       ]),
  dict(slug="ca-clean-energy-mandates", name="Clean-energy mandates", level="state",
       statement="California should keep its clean-energy and emissions-reduction mandates, even if they raise energy costs.",
       help="State law requires utilities to shift to renewable power, and the state has pushed to phase out new gas-car sales. Supporters cite climate and air quality; critics say the mandates raise electricity and gas prices.",
       stances=[
         (B, 1, "Supports the state's clean energy goals but is open to revising them if they make gas and energy unaffordable.", "gov",
          "Becerra says he supports the state’s clean energy transition goals but is open to revising them if they make gas and energy unaffordable, particularly Gov. Gavin Newsom’s ban on selling new gas cars by 2035."),
         (H, -2, "Would roll back climate rules mandating clean energy and emissions cuts, and end requirements to buy solar and wind power.", "gov",
          "Hilton wants to roll back California’s climate rules that mandate a transition to clean energy and a reduction in greenhouse gas emissions in favor of more consumer-friendly policies."),
       ]),
  dict(slug="ca-state-housing-mandates", name="State housing mandates on cities", level="state",
       statement="The state should require cities to allow more housing, including apartments, even over local objections.",
       help="Supporters say local rules block needed housing; opponents say land-use decisions belong to local communities.",
       stances=[
         (B, 2, "Would push cities to zone for apartments, duplexes and condos and crack down on cities that make building harder.", "gov",
          "He would push cities to zone more residential land to build apartments, duplexes and condos and crack down on cities that make it harder to build new housing."),
         ("ca26-rob-bonta", 2, "As attorney general, enforced laws compelling reluctant cities to build new housing.", "ag",
          "As attorney general, Bonta spent much of his first term enforcing housing and criminal justice laws passed in the early 2020s, including laws compelling recalcitrant cities to build new housing."),
         ("ca26-michael-e-gates", -2, "As Huntington Beach city attorney, fought state housing laws that would have compelled the city to build more affordable housing.", "ag",
          "He also fought elements of the new housing laws that would have compelled Huntington Beach to build more affordable housing."),
       ]),
  dict(slug="ca-clear-encampments", name="Homeless encampments", level="state",
       statement="Police should clear homeless encampments, and people offered shelter should not be allowed to stay on the street.",
       help="Since a 2024 Supreme Court ruling, cities can ban camping in public. Supporters say it gets people indoors and restores public spaces; opponents say it moves people around without solving homelessness.",
       stances=[
         (H, 2, "Considers street camping categorically illegal and says police should help clear all encampments.", "gov",
          "Hilton believes that camping on the street, which some cities have banned, is categorically illegal and says police should be involved in clearing all encampments."),
         (B, 1, "Says people shouldn't be allowed to stay on the street when offered shelter, but stopped short of saying they should face arrest.", "gov",
          "He says people should not be allowed to voluntarily stay on the street when offered shelter, but stopped short of saying they should face arrest."),
       ]),
  dict(slug="ca-sanctuary-law", name="Sanctuary law", level="state",
       statement="California should keep its sanctuary law limiting local police cooperation with federal immigration enforcement.",
       help="The 2017 California Values Act limits when local police can help federal immigration agents. Supporters say it keeps immigrant communities willing to work with police; opponents say it shields people who should be deported.",
       stances=[
         (B, 2, "Supports the sanctuary law and defended it in court as attorney general.", "gov",
          "He supports California’s sanctuary law and defended it in court during the first Trump administration."),
         (H, -2, "Wants to overturn the sanctuary law that limits police cooperation with ICE.", "gov",
          "He wants to overturn California’s sanctuary law that limits police cooperation with Immigration and Customs Enforcement."),
       ]),
  dict(slug="ca-medi-cal-undocumented", name="Medi-Cal for undocumented immigrants", level="state",
       statement="State-funded Medi-Cal should keep covering undocumented immigrants.",
       help="Supporters cite public health and lower emergency-room costs; opponents cite the cost to taxpayers.",
       stances=[
         (H, -2, "His main health policy is to end state Medi-Cal coverage for undocumented immigrants and redirect the money.", "gov",
          "Hilton’s primary healthcare policy is to end California’s state-provided MediCal coverage for undocumented immigrants and redirect that money to lower healthcare costs for legal residents."),
       ]),
  dict(slug="ca-challenge-federal-government", name="Relationship with the Trump administration", level="state",
       statement="California's leaders should fight the Trump administration in court rather than seek a cooperative relationship.",
       help="California has sued the federal government over immigration, environmental and funding decisions. Supporters say it protects state law and residents; others say cooperation would bring more federal help.",
       stances=[
         (B, 2, "Makes fighting President Trump a central part of his platform and would keep suing as governor.", "gov",
          "He says he would adopt a similar stance with Trump as governor on such issues as immigration and environmental policy."),
         (H, -2, "Expects a positive, cooperative relationship with President Trump, who endorsed him.", "gov",
          "He has said he expects to have a positive, cooperative relationship with the president and believes that relationship will help California secure more federal help."),
         ("ca26-rob-bonta", 2, "Has filed or joined more than 50 lawsuits against the second Trump administration.", "ag",
          "Since the reelection of Donald Trump, Bonta has filed or joined more than 50 lawsuits against his administration."),
       ]),
  dict(slug="ca-tech-regulation", name="AI and kids' social media rules", level="state",
       statement="The state should regulate AI and children's social media use, such as banning social media for kids under 16.",
       help="Supporters say AI and social media need guardrails to protect kids and workers; opponents say regulation will drive the tech industry out of California.",
       stances=[
         (B, 2, "Supports banning social media for children under 16 and requiring AI developers to be transparent about employment uses.", "gov",
          "Becerra says he supports the state banning children under 16 from being on social media."),
         (H, -2, "Has declined to back regulations or bans and wants fewer rules to keep the AI industry growing.", "gov",
          "But he has declined to back any regulations or bans, and wants to reduce regulations to keep the AI industry growing in California."),
       ]),
  dict(slug="ca-tougher-sentencing", name="Prison sentences", level="state",
       statement="California should be tougher on crime with longer sentences and fewer early releases from prison.",
       help="Voters passed Prop 36 in 2024, raising penalties for some theft and drug crimes. Supporters want more accountability; opponents favor treatment and say longer sentences are costly and don't reduce crime.",
       stances=[
         (H, 2, "Would reopen closed prisons and reduce early release for good conduct.", "gov",
          "Hilton would reopen closed state prisons, reduce the practice of early release based on prisoners’ good conduct and boost rehabilitation programs in prisons."),
         (B, 0, "Voted for Prop 36 and would fully fund it, but hasn't backed longer sentences generally, leaving that to judges.", "gov",
          "But he has not backed longer or stricter criminal sentences in general, saying that decision should be left to judges."),
       ]),
  dict(slug="ca-public-disaster-insurance", name="State disaster insurance", level="state",
       statement="California should create a state-run program that guarantees wildfire and flood insurance coverage.",
       help="Supporters of a public program say it would guarantee coverage; skeptics worry about cost and risk to the state.",
       stances=[
         ("ca26-jane-kim", 2, "Wants \"natural disaster insurance for all,\" a state-run authority guaranteeing wildfire and flood coverage.", "ins",
          "Kim wants to establish “natural disaster insurance for all,” a state-run authority funded by premiums paid to insurance companies that would guarantee coverage for wildfires and floods."),
       ]),
  dict(slug="ca-low-cost-auto-insurance", name="Low-cost auto insurance for all", level="state",
       statement="California's low-cost auto insurance program should be open to every driver, not just low-income drivers.",
       help="The state's low-cost auto insurance program currently serves income-eligible drivers.",
       stances=[
         ("ca26-jane-kim", 2, "Wants to expand the low-cost auto insurance program to every California driver.", "ins",
          "Kim wants to expand a state program that allows low-income drivers to get low-cost insurance to every California driver."),
         ("ca26-ben-allen", -1, "Says opening the program to everyone could hurt the low-income drivers who really need it.", "ins",
          "Allen said expanding eligibility for a low-cost insurance program to everyone could hurt the low-income drivers who really need it."),
       ]),
  dict(slug="ca-voter-id", name="Voter ID", level="state",
       statement="Voters should have to show identification to vote.",
       help="California doesn't require ID for most voters. Prop 39 on this ballot would require it. Supporters say ID prevents fraud; opponents say fraud is rare and ID rules keep eligible people from voting.",
       stances=[
         ("ca26-donald-p-don-wagner", 2, "Supports requiring voter ID at the polls.", "sos",
          "He supports requiring voter ID at the polls and criticizes Weber for the state’s slow ballot-counting process."),
       ]),
  dict(slug="ca-transgender-student-protections", name="Transgender student protections", level="state",
       statement="Schools should keep California's protections for transgender students.",
       help="State law protects students' gender identity in school activities and records. Supporters say it prevents discrimination; opponents argue it limits parents' rights and fairness in sports.",
       stances=[
         ("ca26-sonja-shaw", -2, "An outspoken opponent of protections for transgender students.", "spi",
          "President of the Chino Valley School Board, Shaw has been an outspoken opponent of protections for transgender students."),
       ]),
]
build("ca-general-2026-11-03", "California 2026 General Election Quiz", axes, S)
