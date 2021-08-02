import React from 'react'
import styled from 'styled-components'
import * as color from './color'
import { CardFilter } from './CardFilter'
/*refer App.js import { Header as _Header } from './Header'*/
export function Header({
  filterValue,
  onFilterChange,
  className,
}: {
  filterValue?: string
  onFilterChange?(value: string): void
  className?: string
}) {
  return (
    <Container className={className}>
      <Logo>Kanban board</Logo>
      <CardFilter value={filterValue} onChange={onFilterChange} />
    </Container>
  )
}
const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: ${color.Olive};
`

const Logo = styled.div`
  color: ${color.White};
  font-size: 16px;
  font-weight: bold;
`
