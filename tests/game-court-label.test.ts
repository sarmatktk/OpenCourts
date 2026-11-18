import {expect,it} from 'vitest';
import {gameCourtLabel} from '../functions/lib/game-court-label';
it('uses the park or school name instead of a generic court label',()=>{
 expect(gameCourtLabel({name:'Tennis courts',contextName:'At Fair Lakes Park',address:'Near Main Street'})).toBe('Fair Lakes Park');
 expect(gameCourtLabel({name:'Court 1',contextName:'At Oakton High School'})).toBe('Oakton High School');
});
it('preserves named courts and labels street fallbacks as approximate',()=>{
 expect(gameCourtLabel({name:'Tennis courts',address:'Near Burning Bush Drive'})).toBe('Tennis courts - Near Burning Bush Drive');
 expect(gameCourtLabel({name:'Arthur Ashe Court',contextName:'At Central Park'})).toBe('Arthur Ashe Court');
});
