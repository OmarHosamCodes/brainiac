import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Stack,
  Stat,
  Table,
  Text,
} from "cursor/canvas";

export default function FinSheetJulyEquations() {
  return (
    <Stack gap={20}>
      <Stack gap={6}>
        <H1>Fin-Sheet July (column BF)</H1>
        <Text tone="secondary">
          Source: /home/omar/Downloads/FinSheet.csv · last headed month is July ·
          amounts are sheet units, not Orch minor units
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value="306,323" label="Total income (BF82)" />
        <Stat value="426,146" label="Cost base (5 buckets)" />
        <Stat value="−119,823" label="Team profit amount (BF92)" tone="danger" />
        <Stat value="−28.1%" label="ROI on cost (BF90)" tone="danger" />
      </Grid>

      <Callout tone="warning" title="Row 91 is not team profit">
        The sheet labels BF91 “Team Profit”, but the live formula is
        profit-share ÷ salaries (−59,911 / 240,000 ≈ −25%). The actual profit
        amount lives on the unlabeled row BF92.
      </Callout>

      <H2>Equation chain</H2>
      <Table
        headers={["Cell", "Meaning", "Formula", "July"]}
        columnAlign={["left", "left", "left", "right"]}
        rows={[
          ["BF82", "Total income", "SUM(BF2:BF81)", "306,323"],
          ["BF92", "Profit amount", "BF82−(sal+exp+debt+dev+vac)", "−119,823"],
          ["BF90", "ROI", "(income − cost) / cost", "−28.1%"],
          ["BF93", "Profit / loss share", "(BF92 − charity) / 2", "−59,911"],
          ["BF91", "Share ÷ salaries", "BF93 / BF85", "−25.0%"],
        ]}
      />
      <Text tone="secondary" size="small">
        Cost in BF90 is BF85+BF86+BF88+BF89+BF87 (debt last). BF92 uses the same
        five addends in row order. Charity (BF94) is empty in July, so share is
        half of −119,823 (sheet truncated −59,911.5 → −59,911).
      </Text>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>July cost stack</CardHeader>
          <CardBody>
            <Table
              headers={["Bucket", "Row", "Amount"]}
              columnAlign={["left", "left", "right"]}
              rows={[
                ["Salaries", "BF85", "240,000"],
                ["Expenses", "BF86", "139,646"],
                ["Debt / Discount", "BF87", "20,000"],
                ["Device compensation", "BF88", "24,000"],
                ["200H paid vacation", "BF89", "2,500"],
                ["Cost total", "", "426,146"],
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Clients inside BF82</CardHeader>
          <CardBody>
            <Table
              headers={["Client", "Amount"]}
              columnAlign={["left", "right"]}
              rows={[
                ["Tano", "86,170"],
                ["Tharaa", "86,016"],
                ["Mesh Madrsa", "47,309"],
                ["DR El Nazer", "43,418"],
                ["Interface", "18,022"],
                ["Coaching & Courses", "15,000"],
                ["OGMs Community", "8,750"],
                ["Lucent", "1,638"],
              ]}
            />
            <Text tone="secondary" size="small">
              Eight lines; June (BE) has twelve and income 543,374 — July may
              still be partial.
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <Divider />

      <H2>Versus Orch Money formulas</H2>
      <H3>Restored agency_ops_money_settings</H3>
      <Table
        headers={["Fin-Sheet July", "Orch today"]}
        rows={[
          [
            "ROI = profit / cost",
            "sys_roi = team_profit / total_income",
          ],
          [
            "Profit amount subtracts device comp",
            "sys_team_profit omits device_comp",
          ],
          [
            "Share = (profit − charity) / 2",
            "sys_profit_loss_share = team_loss only",
          ],
          [
            "BF91 = share / salaries",
            "No matching metric; product team-profit is the amount",
          ],
        ]}
      />
      <Text tone="secondary" size="small">
        Received, Remaining, Charity, PBC, and PAC are empty for May–July in
        this export. Algebra: ROI = (306,323 − 426,146) / 426,146.
        Share/salaries = −59,911 / 240,000.
      </Text>
    </Stack>
  );
}
