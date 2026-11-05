import {computed} from 'vue'
import {getApplicationRuntimeEntry,getProjectCodeFromPathname} from '@jetlinks-web-core/utils/project-runtime'
import {isProjectStorageEnabled} from '@jetlinks-web-core/utils/project-storage'
import {mobileEntry,type MobileSide} from '../../utils/mobileEntry'
export function useMobileEntry(side:MobileSide='owner'){
 return computed(()=>mobileEntry(getApplicationRuntimeEntry().applicationId||'',isProjectStorageEnabled()?getProjectCodeFromPathname():'',side))
}
